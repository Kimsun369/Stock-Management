'use client'

import React from 'react'
import useSWR from 'swr'
import { History, Shield } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { AuditLog } from '@/backend/types'
import { Badge } from '@/frontend/components/ui/Badge'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AuditLogsView() {
  const { t, formatDate } = useI18n()
  const { data: logs, isLoading } = useSWR<AuditLog[]>('/api/audit-logs', fetcher)

  const items = logs || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('auditLogs.title')}</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('auditLogs.subtitle')}</p>
      </div>

      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-gray-500 dark:text-zinc-400 font-semibold border-b">
            <tr>
              <th className="px-5 py-3">{t('auditLogs.timestamp')}</th>
              <th className="px-4 py-3">{t('auditLogs.actor')}</th>
              <th className="px-3 py-3">{t('auditLogs.action')}</th>
              <th className="px-3 py-3">{t('auditLogs.entity')}</th>
              <th className="px-5 py-3">{t('auditLogs.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{formatDate(log.createdAt, true)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-zinc-200">{log.actorName || 'Staff'}</td>
                  <td className="px-3 py-3">
                    <Badge variant="info">{log.action}</Badge>
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-zinc-400 font-mono text-[11px]">{log.entityType}</td>
                  <td className="px-5 py-3 text-gray-700 dark:text-zinc-300 max-w-md break-words">{log.details || '—'}</td>
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

