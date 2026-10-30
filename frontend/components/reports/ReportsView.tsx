'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Download, FileSpreadsheet, Filter } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ReportType = 'stock' | 'movements' | 'purchases' | 'leftovers' | 'staff'

export function ReportsView() {
  const { t, language } = useI18n()
  const [reportType, setReportType] = useState<ReportType>('stock')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const queryParams = new URLSearchParams({
    type: reportType,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  })

  const { data, isLoading } = useSWR(`/api/reports?${queryParams.toString()}`, fetcher)

  const handleExportCsv = () => {
    const exportParams = new URLSearchParams({
      type: reportType,
      format: 'csv',
      lang: language,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    })
    window.location.href = `/api/reports?${exportParams.toString()}`
  }

  const tabs: Array<{ id: ReportType; label: string }> = [
    { id: 'stock', label: t('reports.tabStock') },
    { id: 'movements', label: t('reports.tabMovements') },
    { id: 'purchases', label: t('reports.tabPurchases') },
    { id: 'leftovers', label: t('reports.tabLeftovers') },
    { id: 'staff', label: t('reports.tabStaff') },
  ]

  const items = Array.isArray(data) ? data : []
  const columns = items.length > 0 ? Object.keys(items[0]) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('reports.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('reports.subtitle')}</p>
        </div>
        <Button onClick={handleExportCsv} variant="primary" size="sm">
          <Download className="w-4 h-4" />
          <span>{t('common.exportCsv')} (UTF-8 BOM)</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              reportType === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filter Bar & BOM notice */}
      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-40">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder={t('reports.startDate')}
            />
          </div>
          <span className="text-xs text-gray-400">to</span>
          <div className="w-40">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder={t('reports.endDate')}
            />
          </div>
        </div>

        <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{t('reports.exportBomNotice')}</span>
        </p>
      </div>

      {/* Report Table */}
      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 capitalize whitespace-nowrap">
                    {col.replace(/([A-Z])/g, ' $1')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length || 1} className="p-8 text-center text-gray-400">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="p-8 text-center text-gray-400">
                    {t('common.noRecords')}
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

