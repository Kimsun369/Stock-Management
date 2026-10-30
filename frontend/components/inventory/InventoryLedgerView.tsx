'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowDownToLine, ArrowUpFromLine, Undo2, Boxes, Search } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { ProductWithDetails } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Badge } from '@/frontend/components/ui/Badge'

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
          <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b">
            <tr>
              <th className="px-5 py-3">{t('products.sku')}</th>
              <th className="px-4 py-3">{t('products.nameEn')}</th>
              <th className="px-3 py-3">{t('products.category')}</th>
              <th className="px-4 py-3 text-right bg-blue-50/40 text-blue-900">
                {t('inventory.physical')}
              </th>
              <th className="px-4 py-3 text-right bg-amber-50/40 text-amber-900">
                {t('inventory.reserved')}
              </th>
              <th className="px-4 py-3 text-right bg-emerald-50/40 text-emerald-900">
                {t('inventory.available')}
              </th>
              <th className="px-4 py-3 text-center">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
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
                  <tr key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                    <td className="px-5 py-3 font-mono text-gray-600">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{displayName}</td>
                    <td className="px-3 py-3 text-gray-500">
                      {language === 'km' && p.categoryNameKm ? p.categoryNameKm : p.categoryName}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-900 bg-blue-50/20">
                      {formatNumber(p.physicalStock)} <span className="text-[10px] text-gray-400">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-800 bg-amber-50/20">
                      {formatNumber(p.reservedStock)} <span className="text-[10px] text-gray-400">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800 bg-emerald-50/20">
                      {formatNumber(p.availableStock)} <span className="text-[10px] text-gray-400">{p.unit}</span>
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

