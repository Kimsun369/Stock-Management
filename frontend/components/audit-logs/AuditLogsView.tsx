'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { History, Shield, Search, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { AuditLog } from '@/backend/types'
import { Badge } from '@/frontend/components/ui/Badge'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
import { Pagination } from '@/frontend/components/ui/Pagination'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AuditLogsView() {
  const { t, language, formatDate } = useI18n()
  const { data: logs, isLoading } = useSWR<AuditLog[]>('/api/audit-logs', fetcher)

  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const allItems = Array.isArray(logs) ? logs : []

  // Filter logs by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems
    const q = search.toLowerCase().trim()
    return allItems.filter((l) => {
      const matchName = l.actorName?.toLowerCase().includes(q)
      const matchAction = l.action?.toLowerCase().includes(q)
      const matchEntity = l.entityType?.toLowerCase().includes(q)
      const matchDetails = l.details?.toLowerCase().includes(q)
      return matchName || matchAction || matchEntity || matchDetails
    })
  }, [allItems, search])

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  // Action Badge Translator & Styler
  const renderActionBadge = (action: string) => {
    const raw = String(action || '').toUpperCase()

    const actionMap: Record<string, { labelKm: string; labelEn: string; variant: 'success' | 'danger' | 'info' | 'warning' | 'gold' | 'neutral' }> = {
      STOCK_IN: { labelKm: 'បញ្ចូលស្តុក', labelEn: 'Stock In', variant: 'success' },
      STOCK_OUT: { labelKm: 'ដកស្តុក', labelEn: 'Stock Out', variant: 'danger' },
      RETURN: { labelKm: 'ទំនិញបង្វិល', labelEn: 'Return Item', variant: 'info' },
      ADJUSTMENT: { labelKm: 'កែសម្រួលស្តុក', labelEn: 'Stock Adjustment', variant: 'warning' },
      PRODUCT_CREATED: { labelKm: 'បង្កើតផលិតផល', labelEn: 'Product Created', variant: 'success' },
      PRODUCT_UPDATED: { labelKm: 'កែប្រែផលិតផល', labelEn: 'Product Updated', variant: 'info' },
      PRODUCT_DEACTIVATED: { labelKm: 'ផ្អាកផលិតផល', labelEn: 'Product Deactivated', variant: 'warning' },
      PRODUCT_DELETED: { labelKm: 'លុបផលិតផល', labelEn: 'Product Deleted', variant: 'danger' },
      CATEGORY_CREATED: { labelKm: 'បង្កើតប្រភេទ', labelEn: 'Category Created', variant: 'success' },
      CATEGORY_UPDATED: { labelKm: 'កែប្រែប្រភេទ', labelEn: 'Category Updated', variant: 'info' },
      CATEGORY_DELETED: { labelKm: 'លុបប្រភេទ', labelEn: 'Category Deleted', variant: 'danger' },
      STAFF_CREATED: { labelKm: 'បង្កើតគណនី', labelEn: 'Staff Created', variant: 'success' },
      STAFF_UPDATED: { labelKm: 'កែប្រែគណនី', labelEn: 'Staff Updated', variant: 'info' },
      STAFF_DELETED: { labelKm: 'លុបគណនី', labelEn: 'Staff Deleted', variant: 'danger' },
      LEFTOVER_REGISTERED: { labelKm: 'ចុះឈ្មោះផ្ញើ', labelEn: 'Leftover Stored', variant: 'gold' },
      LEFTOVER_COLLECTED: { labelKm: 'ដកទំនិញផ្ញើ', labelEn: 'Leftover Collected', variant: 'success' },
      LEFTOVER_CANCELLED: { labelKm: 'បោះបង់ទំនិញផ្ញើ', labelEn: 'Leftover Cancelled', variant: 'neutral' },
    }

    const conf = actionMap[raw] || { labelKm: raw, labelEn: raw, variant: 'neutral' }
    const label = language === 'km' ? conf.labelKm : conf.labelEn

    return (
      <Badge variant={conf.variant} className="font-khmer font-bold whitespace-nowrap text-xs">
        {label}
      </Badge>
    )
  }

  // Entity Type Translator
  const renderEntityType = (entity: string) => {
    const raw = String(entity || '')
    const entityMap: Record<string, { km: string; en: string }> = {
      Product: { km: 'ផលិតផល', en: 'Product' },
      Category: { km: 'ប្រភេទផលិតផល', en: 'Category' },
      User: { km: 'គណនីបុគ្គលិក', en: 'Staff User' },
      StockTransaction: { km: 'ចលនាស្តុក', en: 'Stock Ledger' },
      CustomerRecord: { km: 'ទំនិញផ្ញើទុក', en: 'Customer Leftovers' },
      CustomerItem: { km: 'មុខទំនិញផ្ញើ', en: 'Customer Item' },
      Setting: { km: 'ការកំណត់', en: 'Settings' },
    }
    const conf = entityMap[raw]
    if (!conf) return <span className="font-mono text-xs">{raw}</span>
    return <span className="font-khmer font-medium text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">{language === 'km' ? conf.km : conf.en}</span>
  }

  // Friendly Khmer Detail Translator
  const formatLogDetail = (details: string) => {
    if (!details) return '—'
    if (language !== 'km') return details

    let d = details
    d = d.replace(/^Deactivated category (.*)/i, 'បានផ្អាកដំណើរការប្រភេទ $1')
    d = d.replace(/^Created user "(.*?)" \((.*?)\) with role (.*)/i, 'បានបង្កើតគណនី "$1" ($2) ជា $3')
    d = d.replace(/^Dispensed (\d+) (.*?) of (.*?) \((.*?)\) -> (\d+)/i, 'បានដកចេញ $1 $2 នៃ $3 (សមតុល្យ: $4 -> $5)')
    d = d.replace(/^Dispensed (\d+) (.*?) of (.*?)/i, 'បានដកចេញ $1 $2 នៃ $3')
    d = d.replace(/^Added (\d+) (.*?) of (.*?) Stock updated: (\d+) -> (\d+)/i, 'បានបញ្ចូល $1 $2 នៃ $3 (ស្តុកកើនឡើង: $4 -> $5)')
    d = d.replace(/^Added (\d+) (.*?) of (.*?)/i, 'បានបញ្ចូល $1 $2 នៃ $3')
    d = d.replace(/^Returned (\d+) (.*?) of (.*?) into available inventory/i, 'បានបង្វិល $1 $2 នៃ $3 ចូលស្តុកវិញ')
    d = d.replace(/^Created product "(.*?)"/i, 'បានបង្កើតផលិតផល "$1"')
    d = d.replace(/^Deactivated product "(.*?)"/i, 'បានផ្អាកផលិតផល "$1"')
    d = d.replace(/^Updated product "(.*?)"/i, 'បានកែប្រែផលិតផល "$1"')
    d = d.replace(/^Registered leftover receipt (.*)/i, 'បានចុះឈ្មោះបង្កាន់ដៃផ្ញើ $1')
    d = d.replace(/^Collected leftover items for (.*)/i, 'អតិថិជនបានដកទំនិញផ្ញើ $1')

    return d
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-khmer">
            {t('auditLogs.title')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-khmer">
            {t('auditLogs.subtitle')}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            placeholder={language === 'km' ? 'ស្វែងរកកំណត់ហេតុ...' : 'Search logs...'}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 font-khmer"
          />
        </div>
      </div>

      {/* Audit Logs Table with STICKY FIRST COLUMN (Staff Name / ឈ្មោះបុគ្គលិក) */}
      <ScrollableTable stickyFirstColumn>
        <table className="w-full text-left text-xs sm:text-sm min-w-[950px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 font-khmer">
            <tr>
              {/* PRIMARY STICKY COLUMN 1: STAFF NAME (ឈ្មោះបុគ្គលិក) */}
              <th className="sticky left-0 z-20 w-px whitespace-nowrap px-4 py-3.5 bg-[#F8FAFC] dark:bg-[#18181D] font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'km' ? 'ឈ្មោះបុគ្គលិក' : t('auditLogs.actor')}
              </th>
              <th className="whitespace-nowrap px-4 py-3.5 text-center">{t('auditLogs.action')}</th>
              <th className="whitespace-nowrap px-4 py-3.5">{t('auditLogs.entity')}</th>
              <th className="px-5 py-3.5 min-w-[320px]">{t('auditLogs.details')}</th>
              <th className="whitespace-nowrap px-5 py-3.5 text-right">{t('auditLogs.timestamp')}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-5 sm:p-8">
                  <TableLoadingCard />
                </td>
              </tr>
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-400 font-khmer text-sm">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr key={log.id} className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                  {/* STICKY COLUMN 1: STAFF NAME (ឈ្មោះបុគ្គលិក) */}
                  <td className="sticky left-0 z-10 w-px whitespace-nowrap px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-[#121216] group-hover:bg-zinc-50/90 dark:group-hover:bg-[#191920] font-khmer shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                        {(log.actorName || 'S').slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {log.actorName || (language === 'km' ? 'បុគ្គលិក' : 'Staff')}
                      </span>
                    </div>
                  </td>

                  {/* Column 2: Action Badge (Translated) */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
                    {renderActionBadge(log.action)}
                  </td>

                  {/* Column 3: Entity Type (Translated) */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {renderEntityType(log.entityType)}
                  </td>

                  {/* Column 4: Details (Formatted & Translated) */}
                  <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300 min-w-[320px] font-khmer text-xs sm:text-sm leading-relaxed">
                    {formatLogDetail(log.details)}
                  </td>

                  {/* Column 5: Timestamp */}
                  <td className="whitespace-nowrap px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium text-right">
                    {formatDate(log.createdAt, true)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollableTable>

      {/* Elder-Friendly Big Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredItems.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
        onItemsPerPageChange={(size) => {
          setItemsPerPage(size)
          setCurrentPage(1)
        }}
        pageSizeOptions={[15, 30, 50, 100]}
      />
    </div>
  )
}
