'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus, Shield, User, Eye, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { User as UserType } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())
type StaffUserSummary = Omit<UserType, 'password'> & { hasPassword: boolean }

export function StaffView() {
  const { t, formatDate } = useI18n()
  const { data: staff, isLoading, mutate } = useSWR<StaffUserSummary[]>('/api/staff', fetcher)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUserSummary | null>(null)
  const [detailUser, setDetailUser] = useState<StaffUserSummary | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const friendlyError = (code: string) => {
    const knownErrors: Record<string, string> = {
      DUPLICATE_EMAIL: 'staff.errors.duplicateEmail',
      USER_NOT_FOUND: 'staff.errors.notFound',
      CANNOT_DELETE_SELF: 'staff.errors.cannotDeleteSelf',
      CANNOT_DELETE_MAIN_ADMIN: 'staff.errors.cannotDeleteMainAdmin',
      CANNOT_CHANGE_MAIN_ADMIN: 'staff.errors.cannotChangeMainAdmin',
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
    setErrorMsg(null); setNotice(null); setIsModalOpen(true)
  }

  const openEdit = (user: StaffUserSummary) => {
    setEditingUser(user); setName(user.name); setEmail(user.email); setPassword(''); setRole(user.role)
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
      setIsModalOpen(false); setNotice(t(editing ? 'staff.messages.updated' : 'staff.messages.created')); await mutate()
    } catch (error: any) {
      setErrorMsg(friendlyError(error.message))
    } finally { setIsSaving(false) }
  }

  const toggleActive = async (user: StaffUserSummary) => {
    try {
      const response = await fetch(`/api/staff/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setNotice(t('staff.messages.updated')); await mutate()
    } catch (error: any) { setNotice(friendlyError(error.message)) }
  }

  const deleteUser = async (user: StaffUserSummary) => {
    if (!window.confirm(t('staff.confirmDelete', { name: user.name, email: user.email }))) return
    try {
      const response = await fetch(`/api/staff/${user.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setDetailUser(null); setNotice(t('staff.messages.deleted')); await mutate()
    } catch (error: any) { setNotice(friendlyError(error.message)) }
  }

  const staffList = Array.isArray(staff) ? staff : []
  const roleOptions = [
    { value: 'STAFF', label: t('staff.roles.STAFF') },
    { value: 'ADMIN', label: t('staff.roles.ADMIN') },
  ]

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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#121216]">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b bg-[#F8FAFC] dark:bg-[#18181D] font-semibold text-gray-500 dark:text-zinc-400"><tr>
              <th className="px-5 py-3">{t('staff.name')}</th><th className="px-4 py-3">{t('staff.email')}</th>
              <th className="px-3 py-3">{t('staff.role')}</th><th className="px-3 py-3">{t('staff.status')}</th>
              <th className="px-4 py-3">{t('common.date')}</th><th className="px-4 py-3 text-right">{t('common.actions')}</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('common.loading')}</td></tr>
                : staffList.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('common.noRecords')}</td></tr>
                : staffList.map((user) => <tr key={user.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3 font-semibold text-gray-900 dark:text-zinc-100"><span className="mr-2 inline-flex rounded-full bg-blue-100 p-1.5 text-blue-700">{user.role === 'ADMIN' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}</span>{user.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-zinc-300">{user.email}</td>
                  <td className="px-3 py-3"><Badge variant={user.role === 'ADMIN' ? 'info' : 'neutral'}>{user.role === 'ADMIN' ? t('auth.roleAdmin') : t('auth.roleStaff')}</Badge></td>
                  <td className="px-3 py-3"><Badge variant={user.active ? 'success' : 'danger'}>{user.active ? t('common.active') : t('common.inactive')}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDetailUser(user)} title={t('common.view')}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)} title={t('common.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                      {user.email.toLowerCase() !== 'povmesa97@gmail.com' && <Button variant="outline" size="sm" onClick={() => toggleActive(user)}>{user.active ? t('common.inactive') : t('common.active')}</Button>}
                      {user.email.toLowerCase() !== 'povmesa97@gmail.com' && <Button variant="danger" size="sm" onClick={() => deleteUser(user)} title={t('common.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? t('staff.editUser') : t('staff.addNew')}>
        <form onSubmit={saveUser} className="space-y-4">
          {errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>}
          <Input label={t('staff.name')} required value={name} onChange={(event) => setName(event.target.value)} />
          <Input label={t('staff.email')} type="email" required value={email} disabled={editingUser?.email.toLowerCase() === 'povmesa97@gmail.com'} onChange={(event) => setEmail(event.target.value)} />
          <Input label={editingUser ? t('staff.newPasswordOptional') : t('auth.password')} type="password" required={!editingUser} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
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
            <div><dt className="text-xs text-zinc-500">{t('staff.status')}</dt><dd>{detailUser.active ? t('common.active') : t('common.inactive')}</dd></div>
            <div><dt className="text-xs text-zinc-500">{t('staff.password')}</dt><dd>{detailUser.hasPassword ? t('staff.passwordSet') : t('staff.googleSignIn')}</dd><p className="mt-1 text-xs text-zinc-500">{t('staff.passwordSecurity')}</p></div>
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
