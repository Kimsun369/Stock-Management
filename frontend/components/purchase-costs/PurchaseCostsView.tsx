'use client'

import React from 'react'
import useSWR from 'swr'
import { Receipt } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { formatUnitLabel } from '@/lib/unit-labels'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PurchaseCostsView() {
  const { t, formatCurrency, formatNumber } = useI18n()
  const { data: purchases, isLoading } = useSWR('/api/reports?type=purchases', fetcher)

  const items = purchases || []
  const totalAmount = items.reduce((sum: number, it: any) => sum + (it.totalAmount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('purchaseCosts.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('purchaseCosts.subtitle')}</p>
        </div>
        <div className="p-3 bg-white dark:bg-[#121216] border border-gray-100 rounded-xl shadow-sm text-right">
          <p className="text-[15px] text-gray-500 dark:text-zinc-400 font-medium uppercase tracking-wider">{t('purchaseCosts.totalAmount')}</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Purchase Costs Table */}
      <ScrollableTable>
        <table className="w-full text-left text-xs min-w-[780px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-gray-500 dark:text-zinc-400 font-semibold border-b">
            <tr>
              <th className="whitespace-nowrap px-5 py-3">{t('purchaseCosts.date')}</th>
              <th className="whitespace-nowrap px-4 py-3 min-w-[180px]">{t('purchaseCosts.product')}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{t('purchaseCosts.quantity')}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{t('purchaseCosts.unitCost')}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">{t('purchaseCosts.totalAmount')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('purchaseCosts.invoice')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-5 sm:p-8">
                  <TableLoadingCard />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              items.map((it: any, idx: number) => (
                <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-zinc-400">{it.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 dark:text-zinc-100">{it.product}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-gray-800 dark:text-zinc-200">
                    {formatNumber(it.quantity)}{formatUnitLabel(it.unit, t)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-gray-600 dark:text-zinc-300">
                    {formatCurrency(it.unitCost)}/{formatUnitLabel(it.unit, t)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-gray-900 dark:text-zinc-100">{formatCurrency(it.totalAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-500 dark:text-zinc-400">{it.invoiceNumber || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  )
}

