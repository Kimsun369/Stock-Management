'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus, Search, Edit2, Trash2, Package, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { ProductWithDetails } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getUnitText(u: string, t: (k: string) => string): string {
  if (!u) return ''
  const clean = u.replace(/^products\.units\./, '').toLowerCase().trim()
  const base = clean.split('/')[0]
  const trans = t(`products.units.${base}`)
  if (trans && !trans.startsWith('products.units.')) return trans
  const direct = t(`products.units.${clean}`)
  if (direct && !direct.startsWith('products.units.')) return direct
  if (clean === 'can') return 'កំប៉ុង'
  if (clean === 'box') return 'កេស'
  if (clean === 'bottle') return 'ដប'
  if (clean === 'carton') return 'កេស'
  if (clean === 'pack') return 'កញ្ចប់'
  return u
}

export function ProductsView({ userRole = 'STAFF' }: { userRole?: 'ADMIN' | 'STAFF' }) {
  const { t, language, formatNumber, formatCurrency } = useI18n()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('ALL')
  const [status, setStatus] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all')
  const [page, setPage] = useState(1)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    nameKm: '',
    categoryId: '',
    brand: '',
    unit: 'can',
    altUnit: 'box',
    conversionRate: '24',
    purchaseCost: '0.65',
    sellingPrice: '1.50',
    minStock: '24',
    description: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const apiUrl = `/api/products?search=${encodeURIComponent(search)}&categoryId=${categoryId}&status=${status}&page=${page}&limit=20`
  const { data, isLoading, mutate } = useSWR(apiUrl, fetcher)
  const { data: categories } = useSWR('/api/categories', fetcher)

  const categoryList = Array.isArray(categories) ? categories : []

  const handleOpenAdd = () => {
    setEditingProduct(null)
    const firstCat = categoryList[0]
    const defaultPrice = firstCat?.agreedPurchasePrice ? String(firstCat.agreedPurchasePrice) : '0.65'
    setFormData({
      sku: '',
      name: '',
      nameKm: '',
      categoryId: firstCat?.id || '',
      brand: '',
      unit: 'can',
      altUnit: 'box',
      conversionRate: '24',
      purchaseCost: defaultPrice,
      sellingPrice: '1.50',
      minStock: '24',
      description: '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: ProductWithDetails) => {
    setEditingProduct(p)
    setFormData({
      sku: p.sku,
      name: p.name,
      nameKm: p.nameKm || '',
      categoryId: p.categoryId,
      brand: p.brand || '',
      unit: p.unit || 'can',
      altUnit: p.altUnit || '',
      conversionRate: String(p.conversionRate || '1'),
      purchaseCost: String(p.purchaseCost),
      sellingPrice: String(p.sellingPrice),
      minStock: String(p.minStock),
      description: p.description || '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleCategoryChangeInForm = (newCatId: string) => {
    const selectedCat = categoryList.find((c: any) => c.id === newCatId)
    setFormData((prev) => ({
      ...prev,
      categoryId: newCatId,
      purchaseCost: selectedCat?.agreedPurchasePrice ? String(selectedCat.agreedPurchasePrice) : prev.purchaseCost,
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          conversionRate: Number(formData.conversionRate) || 1,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save product')
      }

      setIsModalOpen(false)
      setSuccessMsg(t('common.success'))
      setTimeout(() => setSuccessMsg(null), 3000)
      mutate()
    } catch (err: any) {
      setFormError(err.message === 'DUPLICATE_SKU' ? t('errors.DUPLICATE_SKU') : err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`${t('common.confirmDelete')} (${name})`)) return
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' })
      setSuccessMsg(t('common.success'))
      setTimeout(() => setSuccessMsg(null), 3000)
      mutate()
    } catch {
      alert('Error deactivating product')
    }
  }

  const categoryOptions = [
    { value: 'ALL', label: t('common.all') },
    ...categoryList.map((c: any) => ({
      value: c.id,
      label: language === 'km' && c.nameKm ? c.nameKm : c.name,
    })),
  ]

  const unitOptions = [
    { value: 'can', label: t('products.units.can') },
    { value: 'bottle', label: t('products.units.bottle') },
    { value: 'piece', label: t('products.units.piece') },
    { value: 'pack', label: t('products.units.pack') },
    { value: 'box', label: t('products.units.box') },
    { value: 'carton', label: t('products.units.carton') },
    { value: 'kg', label: t('products.units.kg') },
    { value: 'liter', label: t('products.units.liter') },
  ]

  const altUnitOptions = [
    { value: '', label: t('products.noAltUnit') },
    { value: 'box', label: t('products.units.box') },
    { value: 'carton', label: t('products.units.carton') },
    { value: 'pack', label: t('products.units.pack') },
    { value: 'case', label: t('products.units.case') },
  ]

  const productsList: ProductWithDetails[] = data?.products || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('products.title')}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('products.subtitle')}</p>
        </div>
        {userRole === 'ADMIN' && (
          <Button onClick={handleOpenAdd} variant="primary" size="sm">
            <Plus className="w-4 h-4" />
            <span>{t('products.addNew')}</span>
          </Button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
          {successMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder={t('common.search')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <div className="w-full sm:w-44">
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="flex overflow-x-auto max-w-full rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs">
            {(['all', 'inStock', 'lowStock', 'outOfStock'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s)
                  setPage(1)
                }}
                className={`px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                  status === s ? 'bg-amber-400 text-zinc-950 font-extrabold' : 'bg-white dark:bg-[#18181D] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40'
                }`}
              >
                {t(`products.filterStatus.${s}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-zinc-50 dark:bg-[#18181D] text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">{t('products.sku')}</th>
                <th className="px-4 py-3">{t('products.nameEn')}</th>
                <th className="px-4 py-3">{t('products.category')}</th>
                <th className="px-4 py-3">{t('products.unit')}</th>
                <th className="px-4 py-3 text-right">{t('products.purchaseCost')}</th>
                <th className="px-4 py-3 text-right">{t('products.sellingPrice')}</th>
                <th className="px-4 py-3 text-center">{t('products.physicalStock')}</th>
                <th className="px-4 py-3 text-center">{t('products.reservedStock')}</th>
                <th className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400">{t('dashboard.availableStock')}</th>
                <th className="px-4 py-3 text-center">{t('products.status')}</th>
                {userRole === 'ADMIN' && <th className="px-4 py-3 text-right">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : productsList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">
                    {t('common.noRecords')}
                  </td>
                </tr>
              ) : (
                productsList.map((p) => {
                  const displayName = language === 'km' && p.nameKm ? p.nameKm : p.name
                  const subName = language === 'km' ? p.name : p.nameKm

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400 font-semibold">{p.sku}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{displayName}</p>
                            {subName && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none">{subName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {language === 'km' && p.categoryNameKm ? p.categoryNameKm : p.categoryName}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium capitalize">{getUnitText(p.unit, t)}</span>
                        {p.altUnit && p.conversionRate && p.conversionRate > 1 && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-khmer">
                            1 {getUnitText(p.altUnit, t)} = {p.conversionRate} {getUnitText(p.unit, t)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(p.purchaseCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-zinc-600 dark:text-zinc-400">
                        {formatNumber(p.physicalStock)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-amber-600">
                        {formatNumber(p.reservedStock)}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {formatNumber(p.availableStock)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            p.availableStock <= 0
                              ? 'danger'
                              : p.availableStock <= p.minStock
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {p.availableStock <= 0
                            ? t('products.outOfStock')
                            : p.availableStock <= p.minStock
                            ? t('products.lowStock')
                            : t('products.inStock')}
                        </Badge>
                      </td>
                      {userRole === 'ADMIN' && (
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-400/10 dark:bg-amber-400/15"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(p.id, p.name)}
                            className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? t('products.editProduct') : t('products.addNew')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('products.sku')}
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. BEER-ANG-CAN"
            />
            <Select
              label={t('products.category')}
              required
              options={categoryList.map((c: any) => ({
                value: c.id,
                label: language === 'km' && c.nameKm ? c.nameKm : c.name,
              }))}
              value={formData.categoryId}
              onChange={(e) => handleCategoryChangeInForm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('products.nameEn')}
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Angkor Beer Can 330ml"
            />
            <Input
              label={t('products.nameKm')}
              value={formData.nameKm}
              onChange={(e) => setFormData({ ...formData, nameKm: e.target.value })}
              placeholder="ឧទាហរណ៍ ស្រាបៀរអង្គរ កំប៉ុង"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('products.brand')}
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Angkor"
            />
            <Input
              label={t('products.minStock')}
              type="number"
              min="0"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
            />
          </div>

          {/* Unit Conversion Configuration */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{t('products.unitConversionSettings')}</span>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Select
                label={t('products.mainUnit')}
                options={unitOptions}
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
              <Select
                label={t('products.altUnit')}
                options={altUnitOptions}
                value={formData.altUnit}
                onChange={(e) => setFormData({ ...formData, altUnit: e.target.value })}
              />
              <Input
                label={t('products.conversionRate')}
                type="number"
                min="1"
                disabled={!formData.altUnit}
                value={formData.conversionRate}
                onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value })}
                placeholder="24"
              />
            </div>

            {formData.altUnit && Number(formData.conversionRate) > 1 && (
              <div className="p-2 bg-amber-400/10 dark:bg-amber-400/15/80 border border-amber-400/30 rounded-lg text-xs font-semibold text-blue-800 flex items-center justify-between">
                <span>{t('products.conversionRule')}:</span>
                <span className="font-bold">
                  1 {getUnitText(formData.altUnit, t)} = {formData.conversionRate} {getUnitText(formData.unit, t)}
                </span>
              </div>
            )}
          </div>

          {/* Pricing configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label={`${t('products.purchaseCost')} ($)`}
                type="number"
                step="0.01"
                disabled={userRole !== 'ADMIN'}
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
              />
              {userRole !== 'ADMIN' && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">{t('products.priceConfiguredByCategory')}</p>
              )}
            </div>
            <Input
              label={`${t('products.sellingPrice')} ($)`}
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            />
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
