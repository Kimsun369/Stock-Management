'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Plus, Shield, User, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { useToast } from '@/components/ui/toast'
import { User as UserType } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'

const fetcher = (url: string) => fetch(url).then((res) => res.json())
type StaffUserSummary = Omit<UserType, 'password'> & { hasPassword: boolean }

export function StaffView() {
  const { t, formatDate } = useI18n()
  const { showToast } = useToast()
  const { data: session } = useSession()
  const isGoogleMainAdmin = session?.user?.email?.trim().toLowerCase() === 'povmesa97@gmail.com'
  const { data: staff, isLoading, mutate } = useSWR<StaffUserSummary[]>('/api/staff', fetcher)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUserSummary | null>(null)
  const [detailUser, setDetailUser] = useState<StaffUserSummary | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const friendlyError = (code: string) => {
    const knownErrors: Record<string, string> = {
      DUPLICATE_EMAIL: 'staff.errors.duplicateEmail',
      USER_NOT_FOUND: 'staff.errors.notFound',
      CANNOT_DELETE_SELF: 'staff.errors.cannotDeleteSelf',
      CANNOT_DELETE_MAIN_ADMIN: 'staff.errors.cannotDeleteMainAdmin',
      CANNOT_CHANGE_MAIN_ADMIN: 'staff.errors.cannotChangeMainAdmin',
      CANNOT_RESET_ADMIN_PASSWORD: 'staff.errors.cannotResetAdminPassword',
      CANNOT_DELETE_LAST_ADMIN: 'staff.errors.lastAdmin',
      CANNOT_REMOVE_LAST_ADMIN: 'staff.errors.lastAdmin',
      INVALID_ROLE: 'staff.errors.invalidRole',
      UNAUTHORIZED: 'staff.errors.unauthorized',
      FORBIDDEN: 'staff.errors.forbidden',
    }
    return t(knownErrors[code] || 'staff.errors.generic')
  }

  const openAdd = () => {
    setEditingUser(null); setName(''); setEmail(''); setPassword(''); setRole('STAFF')
    setShowPassword(false)
    setErrorMsg(null); setNotice(null); setIsModalOpen(true)
  }

  const openEdit = (user: StaffUserSummary) => {
    setEditingUser(user); setName(user.name); setEmail(user.email); setPassword(''); setRole(user.role)
    setShowPassword(false)
    setErrorMsg(null); setNotice(null); setIsModalOpen(true)
  }

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSaving(true); setErrorMsg(null)
    try {
      const editing = Boolean(editingUser)
      const response = await fetch(editing ? `/api/staff/${editingUser!.id}` : '/api/staff', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, ...(password ? { password } : {}) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save account')
      setIsModalOpen(false)
      const msg = t(editing ? 'staff.messages.updated' : 'staff.messages.created')
      showToast(msg, 'success')
      setNotice(msg)
      await mutate()
    } catch (error: any) {
      const err = friendlyError(error.message)
      setErrorMsg(err)
      showToast(err, 'error')
    } finally { setIsSaving(false) }
  }

  const deleteUser = async (user: StaffUserSummary) => {
    if (!window.confirm(t('staff.confirmDelete', { name: user.name, email: user.email }))) return
    setDeletingId(user.id)
    try {
      const response = await fetch(`/api/staff/${user.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error)
      setDetailUser(null)
      const msg = t('staff.messages.deleted')
      showToast(msg, 'success')
      setNotice(msg)
      await mutate()
    } catch (error: any) {
      const err = friendlyError(error.message)
      showToast(err, 'error')
      setNotice(err)
    } finally {
      setDeletingId(null)
    }
  }

  const staffList = Array.isArray(staff) ? staff : []
  const roleOptions = [
    { value: 'STAFF', label: t('staff.roles.STAFF') },
    { value: 'ADMIN', label: t('staff.roles.ADMIN') },
  ]
  const canSetPassword = !editingUser || isGoogleMainAdmin || editingUser.role === 'STAFF'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('staff.title')}</h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('staff.subtitle')}</p>
        </div>
        <Button onClick={openAdd} variant="primary" size="sm"><Plus className="w-4 h-4" /><span>{t('staff.addNew')}</span></Button>
      </div>

      {notice && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">{notice}<button className="ml-3 underline" onClick={() => setNotice(null)}>{t('staff.dismiss')}</button></div>}

      {/* Staff Table */}
      <ScrollableTable >
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="border-b bg-[#F8FAFC] dark:bg-[#18181D] font-semibold text-gray-500 dark:text-zinc-400">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 min-w-[180px]">{t('staff.name')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('staff.email')}</th>
              <th className="whitespace-nowrap px-3 py-3">{t('staff.role')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('common.date')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right bg-[#F8FAFC] dark:bg-[#18181D]">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr><td colSpan={5} className="p-5 sm:p-8"><TableLoadingCard /></td></tr>
            ) : staffList.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">{t('common.noRecords')}</td></tr>
            ) : staffList.map((user) => (
              <tr key={user.id} className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-900 dark:text-zinc-100">
                  <span className="mr-2 inline-flex rounded-full bg-blue-100 p-1.5 text-blue-700">
                    {user.role === 'ADMIN' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </span>
                  {user.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600 dark:text-zinc-300">{user.email}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <Badge variant={user.role === 'ADMIN' ? 'info' : 'neutral'}>
                    {user.role === 'ADMIN' ? t('auth.roleAdmin') : t('auth.roleStaff')}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right bg-white dark:bg-[#121216] group-hover:bg-zinc-50/90 dark:group-hover:bg-[#191920]">
                  <div className="inline-flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setDetailUser(user)} title={t('common.view')}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(user)} title={t('common.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                    {user.email.toLowerCase() !== 'povmesa97@gmail.com' && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={deletingId === user.id}
                        onClick={() => deleteUser(user)}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? t('staff.editUser') : t('staff.addNew')}>
        <form onSubmit={saveUser} className="space-y-4">
          {errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>}
          <Input label={t('staff.name')} required value={name} onChange={(event) => setName(event.target.value)} />
          <Input label={t('staff.email')} type="email" required value={email} disabled={editingUser?.email.toLowerCase() === 'povmesa97@gmail.com'} onChange={(event) => setEmail(event.target.value)} />
          {canSetPassword && <div className="relative">
            <Input label={editingUser ? t('staff.newPasswordOptional') : t('auth.password')} type={showPassword ? 'text' : 'password'} required={!editingUser} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-8 rounded p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>}
          <Select label={t('staff.role')} options={roleOptions} value={role} disabled={editingUser?.email.toLowerCase() === 'povmesa97@gmail.com'} onChange={(event) => setRole(event.target.value as 'ADMIN' | 'STAFF')} />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(detailUser)} onClose={() => setDetailUser(null)} title={detailUser?.name || t('staff.title')}>
        {detailUser && <div className="space-y-5">
          <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <div><dt className="text-xs text-zinc-500">{t('staff.name')}</dt><dd className="font-semibold">{detailUser.name}</dd></div>
            <div><dt className="text-xs text-zinc-500">{t('staff.email')}</dt><dd className="break-all font-medium">{detailUser.email}</dd></div>
            <div><dt className="text-xs text-zinc-500">{t('staff.role')}</dt><dd>{detailUser.role === 'ADMIN' ? t('auth.roleAdmin') : t('auth.roleStaff')}</dd></div>
            {(isGoogleMainAdmin || detailUser.role === 'STAFF') && <div><dt className="text-xs text-zinc-500">{t('staff.password')}</dt><dd>{detailUser.hasPassword ? t('staff.passwordSet') : t('staff.googleSignIn')}</dd><p className="mt-1 text-xs text-zinc-500">{t('staff.passwordSecurity')}</p></div>}
            <div><dt className="text-xs text-zinc-500">{t('common.date')}</dt><dd>{formatDate(detailUser.createdAt)}</dd></div>
          </dl>
          <div className="flex justify-end gap-2">
            {detailUser.email.toLowerCase() !== 'povmesa97@gmail.com' && <Button variant="danger" size="sm" onClick={() => deleteUser(detailUser)}><Trash2 className="h-4 w-4" />{t('common.delete')}</Button>}
            <Button variant="primary" size="sm" onClick={() => { const current = detailUser; setDetailUser(null); openEdit(current) }}><Pencil className="h-4 w-4" />{t('common.edit')}</Button>
          </div>
        </div>}
      </Modal>
    </div>
  )
}
