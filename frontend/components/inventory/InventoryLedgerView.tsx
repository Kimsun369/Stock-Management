'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowDownToLine, ArrowUpFromLine, Undo2, Search } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { ProductWithDetails } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Badge } from '@/frontend/components/ui/Badge'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
import { Select } from '@/frontend/components/ui/Select'
import { formatStockQuantity, formatUnitLabel } from '@/lib/unit-labels'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function InventoryLedgerView() {
  const { t, language, formatNumber } = useI18n()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('ALL')
  const { data, isLoading } = useSWR(`/api/products?search=${encodeURIComponent(search)}&categoryId=${categoryId}&limit=500&status=all`, fetcher)
  const { data: categories } = useSWR('/api/categories', fetcher)

  const products: ProductWithDetails[] = data?.products || []
  const categoryOptions = [
    { value: 'ALL', label: t('common.selectCategory') },
    ...(Array.isArray(categories) ? categories : []).map((category: any) => ({
      value: category.id,
      label: language === 'km' && category.nameKm ? category.nameKm : category.name,
    })),
  ]
  const categorySummary = Array.isArray(categories) ? categories : []
  const allProductCount = categorySummary.reduce((count: number, category: any) => count + (Number(category.productCount) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('inventory.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t('inventory.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/stock-in">
            <Button variant="primary" size="sm">
              <ArrowDownToLine className="w-4 h-4" />
              <span>{t('nav.stockIn')}</span>
            </Button>
          </Link>
          <Link href="/dashboard/stock-out">
            <Button variant="secondary" size="sm">
              <ArrowUpFromLine className="w-4 h-4" />
              <span>{t('nav.stockOut')}</span>
            </Button>
          </Link>
          <Link href="/dashboard/returned-items">
            <Button variant="outline" size="sm">
              <Undo2 className="w-4 h-4" />
              <span>{t('nav.returnedItems')}</span>
            </Button>
          </Link>
        </div>
      </div>

      <section aria-labelledby="inventory-category-summary" className="space-y-3">
        <h2 id="inventory-category-summary" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          {t('inventory.categorySummary')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <button
            type="button"
            aria-pressed={categoryId === 'ALL'}
            onClick={() => setCategoryId('ALL')}
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
              onClick={() => setCategoryId(category.id)}
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

      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            label={t('reports.filterCategory')}
            options={categoryOptions}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <ScrollableTable stickyFirstColumn>
        <table className="w-full text-left text-xs min-w-[1050px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-gray-500 dark:text-zinc-400 font-semibold border-b">
            <tr>
              <th className="sticky left-0 z-20 w-px whitespace-nowrap px-3.5 py-3 bg-[#F8FAFC] dark:bg-[#18181D]">{language === 'km' ? 'ឈ្មោះផលិតផល' : 'Product Name'}</th>
              <th className="whitespace-nowrap px-4 py-3">{language === 'km' ? 'ប្រភេទ' : 'Category'}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('products.conversionRule')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right bg-blue-50/40 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                {t('products.availableStock')}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right bg-amber-50/40 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                {t('products.customerLeftovers')}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right bg-emerald-50/40 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                {t('products.totalStock')}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-center bg-[#F8FAFC] dark:bg-[#18181D]">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-5 sm:p-8">
                  <TableLoadingCard />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const displayName = language === 'km' && p.nameKm ? p.nameKm : p.name
                return (
                  <tr key={p.id} className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="sticky left-0 z-10 w-px whitespace-nowrap px-3.5 py-3 font-semibold text-gray-900 dark:text-zinc-100 bg-white dark:bg-[#121216] group-hover:bg-zinc-50/90 dark:group-hover:bg-[#191920]">{displayName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-zinc-400">
                      {language === 'km' && p.categoryNameKm ? p.categoryNameKm : p.categoryName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-zinc-300">
                      {p.altUnit && p.conversionRate && p.conversionRate > 1
                        ? `1 ${formatUnitLabel(p.unit, t)} = ${p.conversionRate} ${formatUnitLabel(p.altUnit, t)}`
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
                    <td className="whitespace-nowrap px-4 py-3 text-center bg-white dark:bg-[#121216] group-hover:bg-zinc-50/90 dark:group-hover:bg-[#191920]">
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
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  )
}

