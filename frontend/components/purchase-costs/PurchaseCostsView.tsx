'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Receipt } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { formatUnitLabel } from '@/lib/unit-labels'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
import { Pagination } from '@/frontend/components/ui/Pagination'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PurchaseCostsView() {
  const { t, language, formatCurrency, formatNumber } = useI18n()
  const { data: purchases, isLoading } = useSWR('/api/reports?type=purchases', fetcher)

  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const items = Array.isArray(purchases) ? purchases : []
  const totalAmount = items.reduce((sum: number, it: any) => sum + (it.totalAmount || 0), 0)

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1
  const paginatedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-khmer">
            {t('purchaseCosts.title')}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-khmer">
            {t('purchaseCosts.subtitle')}
          </p>
        </div>
        <div className="p-3 bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs text-right">
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider font-khmer">
            {t('purchaseCosts.totalAmount')}
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Purchase Costs Table */}
      <ScrollableTable>
        <table className="w-full text-left text-xs sm:text-sm min-w-[780px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 font-khmer">
            <tr>
              <th className="w-px whitespace-nowrap px-3.5 py-3.5">{t('purchaseCosts.date')}</th>
              <th className="whitespace-nowrap px-4 py-3.5 min-w-[160px]">{t('purchaseCosts.product')}</th>
              <th className="whitespace-nowrap px-3 py-3.5 text-right">{t('purchaseCosts.quantity')}</th>
              <th className="whitespace-nowrap px-3 py-3.5 text-right">{t('purchaseCosts.unitCost')}</th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right">{t('purchaseCosts.totalAmount')}</th>
              <th className="whitespace-nowrap px-4 py-3.5">{t('purchaseCosts.invoice')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-5 sm:p-8">
                  <TableLoadingCard />
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400 font-khmer">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              paginatedItems.map((it: any, idx: number) => {
                const displayName = language === 'km' && it.productKm ? it.productKm : it.product
                const subName = language === 'km' ? it.product : it.productKm

                return (
                  <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="w-px whitespace-nowrap px-3.5 py-3.5 text-zinc-500 dark:text-zinc-400">{it.date}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 font-khmer">{displayName}</div>
                      {subName && <div className="text-[11px] text-zinc-400 font-medium">{subName}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatNumber(it.quantity)} {formatUnitLabel(it.unit, t)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right text-zinc-600 dark:text-zinc-300">
                      {formatCurrency(it.unitCost)} / {formatUnitLabel(it.unit, t)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(it.totalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">{it.invoiceNumber || '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </ScrollableTable>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={items.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(p) => setPage(p)}
        onItemsPerPageChange={(sz) => {
          setItemsPerPage(sz)
          setPage(1)
        }}
        pageSizeOptions={[15, 30, 50, 100]}
      />
    </div>
  )
}
