'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus, UserPlus, Key, Shield, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { User as UserType } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function StaffView() {
  const { t, formatDate } = useI18n()
  const { data: staff, isLoading, mutate } = useSWR<UserType[]>('/api/staff', fetcher)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('StaffPass123!')
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleOpenAdd = () => {
    setName('')
    setEmail('')
    setPassword('StaffPass123!')
    setRole('STAFF')
    setErrorMsg(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create user')

      setIsModalOpen(false)
      mutate()
    } catch (err: any) {
      setErrorMsg(err.message === 'DUPLICATE_EMAIL' ? 'An account with this email already exists' : err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (u: UserType) => {
    const actionName = u.active ? 'deactivate' : 'activate'
    if (!window.confirm(`Are you sure you want to ${actionName} ${u.name}?`)) return

    try {
      await fetch(`/api/staff/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !u.active }),
      })
      mutate()
    } catch {
      alert('Error updating user')
    }
  }

  const handleResetPassword = async (u: UserType) => {
    const newPass = window.prompt(`Enter new password for ${u.name}:`, 'NewPassword123!')
    if (!newPass) return

    try {
      await fetch(`/api/staff/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      })
      alert('Password updated successfully')
    } catch {
      alert('Error resetting password')
    }
  }

  const staffList = Array.isArray(staff) ? staff : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('staff.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('staff.subtitle')}</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" size="sm" className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          <span>{t('staff.addNew')}</span>
        </Button>
      </div>

      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
          <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b">
            <tr>
              <th className="px-5 py-3">{t('staff.name')}</th>
              <th className="px-4 py-3">{t('staff.email')}</th>
              <th className="px-3 py-3">{t('staff.role')}</th>
              <th className="px-3 py-3">{t('staff.status')}</th>
              <th className="px-4 py-3">{t('common.date')}</th>
              <th className="px-4 py-3 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : staffList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              staffList.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-blue-100 text-blue-700">
                        {u.role === 'ADMIN' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{u.email}</td>
                  <td className="px-3 py-3">
                    <Badge variant={u.role === 'ADMIN' ? 'info' : 'neutral'}>
                      {u.role === 'ADMIN' ? t('auth.roleAdmin') : t('auth.roleStaff')}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={u.active ? 'success' : 'danger'}>
                      {u.active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      title={t('staff.resetPassword')}
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="text-[11px] font-semibold text-gray-500 hover:text-red-600"
                    >
                      {u.active ? t('common.inactive') : t('common.active')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('staff.addNew')}>
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <Input
            label={t('staff.name')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chan Sokha (ចាន់ សុខា)"
          />

          <Input
            label={t('staff.email')}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@karaokestock.com"
          />

          <Input
            label={t('auth.password')}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Select
            label={t('staff.role')}
            options={[
              { value: 'STAFF', label: t('staff.roles.STAFF') },
              { value: 'ADMIN', label: t('staff.roles.ADMIN') },
            ]}
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

