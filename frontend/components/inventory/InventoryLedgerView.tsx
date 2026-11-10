'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowDownToLine, ArrowUpFromLine, Undo2, Search } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { ProductWithDetails } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Badge } from '@/frontend/components/ui/Badge'
import { formatStockQuantity } from '@/lib/unit-labels'

function getUnitLabel(u: string): string {
  if (!u) return ''
  const clean = u.replace(/^products\.units\./, '').toLowerCase().split('/')[0].trim()
  const map: Record<string, string> = {
    can: 'កំប៉ុង',
    bottle: 'ដប',
    box: 'កេស',
    carton: 'កេស',
    pack: 'កញ្ចប់',
    piece: 'ដំណាត់',
    kg: 'គីឡូក្រាម',
    liter: 'លីត្រ',
    sheet: 'សន្លឹក',
    case: 'កេស',
    unit: 'ឯកតា',
    units: 'ឯកតា',
  }
  return map[clean] || u
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function InventoryLedgerView() {
  const { t, language, formatNumber } = useI18n()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useSWR(`/api/products?search=${encodeURIComponent(search)}&limit=100`, fetcher)

  const products: ProductWithDetails[] = data?.products || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('inventory.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t('inventory.formula')} ({t('inventory.subtitle')})
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

      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-gray-500 dark:text-zinc-400 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">{language === 'km' ? 'ឈ្មោះផលិតផល' : 'Product Name'}</th>
              <th className="px-3 py-3">{language === 'km' ? 'ប្រភេទ' : 'Category'}</th>
              <th className="px-4 py-3 text-right bg-blue-50/40 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                {t('inventory.physical')}
              </th>
              <th className="px-4 py-3 text-right bg-amber-50/40 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                {t('inventory.reserved')}
              </th>
              <th className="px-4 py-3 text-right bg-emerald-50/40 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                {t('inventory.available')}
              </th>
              <th className="px-4 py-3 text-center">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const displayName = language === 'km' && p.nameKm ? p.nameKm : p.name
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-zinc-100">{displayName}</td>
                    <td className="px-3 py-3 text-gray-500 dark:text-zinc-400">
                      {language === 'km' && p.categoryNameKm ? p.categoryNameKm : p.categoryName}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-900 bg-blue-50/20 dark:bg-blue-950/20 dark:text-blue-300">
                      {formatStockQuantity(p.physicalStock, p.unit, p.altUnit, p.conversionRate, t)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-800 bg-amber-50/20 dark:bg-amber-950/20 dark:text-amber-300">
                      {formatStockQuantity(p.reservedStock, p.unit, p.altUnit, p.conversionRate, t)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20 dark:text-emerald-300">
                      {formatStockQuantity(p.availableStock, p.unit, p.altUnit, p.conversionRate, t)}
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
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

