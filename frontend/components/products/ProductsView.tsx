'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus, Search, Edit2, Trash2, Package, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { useToast } from '@/components/ui/toast'
import { ProductWithDetails } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
import { SuccessNotice } from '@/frontend/components/ui/SuccessNotice'
import { formatStockQuantity, formatUnitLabel } from '@/lib/unit-labels'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getUnitText(u: string, t: (k: string) => string): string {
  return formatUnitLabel(u, t)
}

function getEditableMainUnit(unit: string): string {
  const value = unit.trim().toLowerCase()
  const aliases: Record<string, string> = {
    'កំប៉ុង': 'can', 'ដប': 'bottle', 'ដុំ': 'piece', 'សន្លឹក': 'sheet',
    'កេស': 'carton', 'កញ្ចប់': 'pack', 'case': 'carton', 'box': 'carton',
    'package': 'pack',
  }
  return aliases[value] || value
}

function getEditablePackagingUnit(unit: string): string {
  const value = unit.trim().toLowerCase()
  if (['piece', 'ដុំ'].includes(value)) return 'piece'
  if (['case', 'carton', 'box', 'កេស'].includes(value)) return 'កេស'
  if (['pack', 'package', 'កញ្ចប់'].includes(value)) return 'កញ្ចប់'
  return ''
}

export function ProductsView({ userRole = 'STAFF' }: { userRole?: 'ADMIN' | 'STAFF' }) {
  const { t, language, formatNumber, formatCurrency } = useI18n()
  const { showToast } = useToast()
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
    unit: 'unit',
    altUnit: '',
    conversionRate: '1',
    purchaseCost: '',
    minStock: '5',
    description: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Match the Inventory ledger's page size so both views render the same backend rows.
  const apiUrl = `/api/products?search=${encodeURIComponent(search)}&categoryId=${categoryId}&status=${status}&page=${page}&limit=500`
  const { data, isLoading, mutate } = useSWR(apiUrl, fetcher, { refreshInterval: 30000 })
  const { data: categories } = useSWR('/api/categories', fetcher)

  const categoryList = Array.isArray(categories) ? categories : []

  const handleOpenAdd = () => {
    setEditingProduct(null)
    const firstCat = categoryList[0]
    setFormData({
      sku: '',
      name: '',
      nameKm: '',
      categoryId: firstCat?.id || '',
      unit: 'unit',
      altUnit: '',
      conversionRate: '1',
      purchaseCost: '',
      minStock: '5',
      description: '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: ProductWithDetails) => {
    setEditingProduct(p)
    // API unit pairs are normalized as package -> inner unit; the edit form stores
    // inner unit -> package so its conversion reads “1 package = N inner units”.
    const hasPackaging = Boolean(p.altUnit && Number(p.conversionRate) > 1)
    const editMainUnit = getEditableMainUnit((hasPackaging ? p.altUnit : p.unit) || 'unit')
    const editPackagingUnit = hasPackaging ? getEditablePackagingUnit(p.unit) : ''
    setFormData({
      sku: p.sku,
      name: p.name,
      nameKm: p.nameKm || '',
      categoryId: p.categoryId,
      unit: editMainUnit || 'unit',
      altUnit: editPackagingUnit,
      conversionRate: String(p.conversionRate || '1'),
      purchaseCost: String(p.purchaseCost),
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
      showToast(editingProduct ? t('common.updated') : t('common.created'), 'success')
      setSuccessMsg(editingProduct ? t('common.updated') : t('common.created'))
      setTimeout(() => setSuccessMsg(null), 6000)
      mutate()
    } catch (err: any) {
      const msg = err.message === 'DUPLICATE_SKU' ? t('errors.DUPLICATE_SKU') : err.message
      setFormError(msg)
      showToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`${t('common.confirmDelete')} (${name})`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to deactivate product')
      }
      showToast(t('common.deleted'), 'success')
      setSuccessMsg(t('common.success'))
      setTimeout(() => setSuccessMsg(null), 3000)
      mutate()
    } catch (err: any) {
      showToast(err.message || 'Error deactivating product', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const categoryOptions = [
    { value: 'ALL', label: t('common.selectCategory') },
    ...categoryList.map((c: any) => ({
      value: c.id,
      label: language === 'km' && c.nameKm ? c.nameKm : c.name,
    })),
  ]

  const unitOptions = [
    { value: 'unit', label: t('products.units.unit') },
    { value: 'can', label: t('products.units.can') },
    { value: 'bottle', label: t('products.units.bottle') },
    { value: 'piece', label: t('products.units.piece') },
    { value: 'pack', label: t('products.units.pack') },
    { value: 'sheet', label: t('products.units.sheet') },
    { value: 'carton', label: t('products.units.carton') },
    { value: 'kg', label: t('products.units.kg') },
    { value: 'liter', label: t('products.units.liter') },
  ]

  const altUnitOptions = [
    { value: '', label: t('products.noAltUnit') },
    { value: 'piece', label: t('products.units.piece') },
    { value: 'កេស', label: t('products.units.carton') },
    { value: 'កញ្ចប់', label: t('products.units.pack') },
  ]

  const productsList: ProductWithDetails[] = data?.products || []
  const categorySummary = categoryList
  const allProductCount = categorySummary.reduce(
    (count: number, category: any) => count + (Number(category.productCount) || 0),
    0
  )

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
        <SuccessNotice>{successMsg}</SuccessNotice>
      )}

      <section aria-labelledby="products-category-summary" className="space-y-3">
        <h2 id="products-category-summary" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          {t('inventory.categorySummary')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <button
            type="button"
            aria-pressed={categoryId === 'ALL'}
            onClick={() => {
              setCategoryId('ALL')
              setPage(1)
            }}
            className={`min-w-0 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${categoryId === 'ALL' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-800 dark:bg-[#121216] dark:hover:border-amber-700'}`}
          >
            <span className="block truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('inventory.allProducts')}</span>
            <span className="mt-1 block text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatNumber(allProductCount)}</span>
          </button>
          {categorySummary.map((category: any) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => {
                setCategoryId(category.id)
                setPage(1)
              }}
              className={`min-w-0 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${categoryId === category.id ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-zinc-200 bg-white hover:border-amber-300 dark:border-zinc-800 dark:bg-[#121216] dark:hover:border-amber-700'}`}
            >
              <span className="block truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {language === 'km' && category.nameKm ? category.nameKm : category.name}
              </span>
              <span className="mt-1 block text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatNumber(category.productCount || 0)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="relative w-full sm:max-w-sm">
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

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Select
              label={t('reports.filterCategory')}
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="flex min-h-10 overflow-x-auto max-w-full rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs">
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
      <ScrollableTable stickyActions={userRole === 'ADMIN'} stickyFirstColumn>
        <table className="w-full text-left text-xs min-w-[1320px]">
          <thead className="bg-zinc-50 dark:bg-[#18181D] text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 min-w-[220px]">{t('products.nameEn')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('products.category')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('products.unit')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('products.conversionRule')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right bg-blue-50/40 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">{t('products.availableStock')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right bg-amber-50/40 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">{t('products.customerLeftovers')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-bold bg-emerald-50/40 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{t('products.totalStock')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-center">{t('common.status')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">{t('products.purchaseCost')}</th>
              {userRole === 'ADMIN' && (
                <th className="sticky right-0 z-20 whitespace-nowrap px-4 py-3 text-right bg-zinc-50 dark:bg-[#18181D]">
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={userRole === 'ADMIN' ? 10 : 9} className="p-5 sm:p-8">
                  <TableLoadingCard />
                </td>
              </tr>
            ) : productsList.length === 0 ? (
              <tr>
                <td colSpan={userRole === 'ADMIN' ? 10 : 9} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              productsList.map((p) => {
                const displayName = language === 'km' && p.nameKm ? p.nameKm : p.name

                return (
                  <tr key={p.id} className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{displayName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {language === 'km' && p.categoryNameKm ? p.categoryNameKm : p.categoryName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium capitalize">{getUnitText(p.unit, t)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {p.altUnit && p.conversionRate && p.conversionRate > 1
                        ? `1 ${getUnitText(p.unit, t)} = ${p.conversionRate} ${getUnitText(p.altUnit, t)}`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-blue-900 bg-blue-50/20 dark:bg-blue-950/20 dark:text-blue-300">
                      {formatStockQuantity(p.availableStock, p.unit, p.altUnit, p.conversionRate, t)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-800 bg-amber-50/20 dark:bg-amber-950/20 dark:text-amber-300">
                      {formatStockQuantity(p.customerLeftoverStock, p.unit, p.altUnit, p.conversionRate, t)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20 dark:text-emerald-300">
                      {formatStockQuantity(p.physicalStock, p.unit, p.altUnit, p.conversionRate, t)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
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
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(p.purchaseCost)} / {getUnitText(p.unit, t)}
                    </td>
                    {userRole === 'ADMIN' && (
                      <td className="sticky right-0 z-10 whitespace-nowrap px-4 py-3 text-right space-x-1 bg-white dark:bg-[#121216] group-hover:bg-zinc-50/90 dark:group-hover:bg-[#191920]">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-400/10 dark:bg-amber-400/15"
                          title={t('common.edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(p.id, p.name)}
                          disabled={deletingId === p.id}
                          className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title={t('common.delete')}
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500 inline-block" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </ScrollableTable>

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

          <div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div>
            <Input
              label={t('products.minStock')}
              type="number"
              min="0"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
            />
          </div>

          {/* Unit Conversion Configuration */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Package className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{t('products.unitConversionSettings')}</span>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="sm:col-span-2">
                <Input
                  label={t('products.conversionRate')}
                  type="number"
                  min="1"
                  disabled={!formData.altUnit}
                  value={formData.conversionRate}
                  onChange={(e) => setFormData({ ...formData, conversionRate: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            {formData.altUnit && Number(formData.conversionRate) > 1 && (
              <div className="mt-4 flex flex-col gap-1 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                <span>{t('products.conversionRule')}</span>
                <span className="font-semibold">
                  1 {getUnitText(formData.altUnit, t)} = {formData.conversionRate} {getUnitText(formData.unit, t)}
                </span>
              </div>
            )}
          </div>

          {/* Pricing configuration */}
          <div className="grid grid-cols-1 gap-3">
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
                <p className="text-[15px] text-zinc-500 dark:text-zinc-400 mt-1">{t('products.priceConfiguredByCategory')}</p>
              )}
            </div>
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
