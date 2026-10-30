'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus, Edit2, Trash2, Tags, DollarSign } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Category } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Modal } from '@/frontend/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function CategoriesView({ userRole = 'STAFF' }: { userRole?: 'ADMIN' | 'STAFF' }) {
  const { t, language, formatCurrency } = useI18n()
  const { data: categories, isLoading, mutate } = useSWR<Category[]>('/api/categories', fetcher)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [nameKm, setNameKm] = useState('')
  const [description, setDescription] = useState('')
  const [agreedPurchasePrice, setAgreedPurchasePrice] = useState('0.00')
  const [applyToProducts, setApplyToProducts] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleOpenAdd = () => {
    setEditingCategory(null)
    setName('')
    setNameKm('')
    setDescription('')
    setAgreedPurchasePrice('0.00')
    setApplyToProducts(true)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c)
    setName(c.name)
    setNameKm(c.nameKm || '')
    setDescription(c.description || '')
    setAgreedPurchasePrice(String(c.agreedPurchasePrice || '0.00'))
    setApplyToProducts(true)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          nameKm,
          description,
          agreedPurchasePrice: Number(agreedPurchasePrice) || 0,
          applyToProducts,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')

      setIsModalOpen(false)
      setSuccessMsg(t('common.success'))
      setTimeout(() => setSuccessMsg(null), 3000)
      mutate()
    } catch (err: any) {
      setFormError(err.message === 'DUPLICATE_CATEGORY' ? t('categories.duplicate') : err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`${t('common.confirmDelete')} (${c.name})`)) return
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error === 'CATEGORY_HAS_PRODUCTS' ? t('categories.cannotDeleteHasProducts') : json.error)
        return
      }
      mutate()
    } catch {
      alert('Error deleting category')
    }
  }

  const categoryList = Array.isArray(categories) ? categories : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('categories.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('categories.subtitle')}</p>
        </div>
        {userRole === 'ADMIN' && (
          <Button onClick={handleOpenAdd} variant="primary" size="sm" className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            <span>{t('categories.addNew')}</span>
          </Button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
          {successMsg}
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-[#F8FAFC] text-zinc-500 dark:text-zinc-400 font-semibold border-b">
            <tr>
              <th className="px-5 py-3">{t('categories.title')}</th>
              <th className="px-4 py-3">{t('categories.description')}</th>
              <th className="px-4 py-3 text-right">{t('categories.agreedPurchasePrice')}</th>
              <th className="px-3 py-3 text-center">{t('categories.productCount')}</th>
              {userRole === 'ADMIN' && <th className="px-4 py-3 text-right">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={userRole === 'ADMIN' ? 5 : 4} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : categoryList.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'ADMIN' ? 5 : 4} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              categoryList.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-400/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400">
                        <Tags className="w-3.5 h-3.5" />
                      </div>
                      <span>{language === 'km' && c.nameKm ? c.nameKm : c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{c.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    {formatCurrency(c.agreedPurchasePrice || 0)}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">{c.productCount || 0}</td>
                  {userRole === 'ADMIN' && (
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-400/10 dark:bg-amber-400/15"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 rounded text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? t('categories.editCategory') : t('categories.addNew')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
              {formError}
            </div>
          )}

          <Input
            label={t('categories.nameEn')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Beer & Cider"
          />

          <Input
            label={t('categories.nameKm')}
            value={nameKm}
            onChange={(e) => setNameKm(e.target.value)}
            placeholder="ឧទាហរណ៍ ស្រាបៀរ និងស៊ីដឺ"
          />

          <Input
            label={t('categories.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description / ការពិពណ៌នា"
          />

          <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{t('categories.pricingConfiguration')}</span>
            </div>
            <Input
              label={`${t('categories.agreedPurchasePrice')} ($)`}
              type="number"
              step="0.01"
              min="0"
              required
              value={agreedPurchasePrice}
              onChange={(e) => setAgreedPurchasePrice(e.target.value)}
              placeholder="0.65"
            />
            {editingCategory && (
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={applyToProducts}
                  onChange={(e) => setApplyToProducts(e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 dark:text-amber-400 focus:ring-blue-500"
                />
                <span>{t('categories.applyPriceToProducts')}</span>
              </label>
            )}
          </div>

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
