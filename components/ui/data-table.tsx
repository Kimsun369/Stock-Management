'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
  sticky?: 'right' | 'left'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  total?: number
  className?: string
  tableClassName?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found',
  page = 1,
  totalPages = 1,
  onPageChange,
  total,
  className,
  tableClassName,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-[#121216]">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, r) => (
            <div key={r} className="flex gap-4 mb-3">
              {columns.map((_, c) => (
                <Skeleton key={c} className="h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-[#121216] shadow-2xs">
        <table className={cn('w-full text-sm min-w-[700px]', tableClassName)}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-zinc-800 dark:bg-[#18181D]">
              {columns.map((col) => {
                const isStickyRight = col.sticky === 'right' || col.key === 'actions'
                const isStickyLeft = col.sticky === 'left'

                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 whitespace-nowrap',
                      isStickyRight && 'sticky right-0 z-20 bg-gray-50 dark:bg-[#18181D] border-l border-gray-200 dark:border-zinc-800 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.06)]',
                      isStickyLeft && 'sticky left-0 z-20 bg-gray-50 dark:bg-[#18181D] border-r border-gray-200 dark:border-zinc-800 shadow-[6px_0_8px_-4px_rgba(0,0,0,0.06)]',
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="group hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                  {columns.map((col) => {
                    const isStickyRight = col.sticky === 'right' || col.key === 'actions'
                    const isStickyLeft = col.sticky === 'left'

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-gray-700 dark:text-zinc-200 whitespace-nowrap',
                          isStickyRight && 'sticky right-0 z-10 bg-white dark:bg-[#121216] group-hover:bg-gray-50/90 dark:group-hover:bg-[#191920] border-l border-gray-100 dark:border-zinc-800 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.06)]',
                          isStickyLeft && 'sticky left-0 z-10 bg-white dark:bg-[#121216] group-hover:bg-gray-50/90 dark:group-hover:bg-[#191920] border-r border-gray-100 dark:border-zinc-800 shadow-[6px_0_8px_-4px_rgba(0,0,0,0.06)]',
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row, rowIdx)
                          : String(row[col.key] ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {total !== undefined && `${total} records total`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 rounded-lg bg-gray-100 font-medium text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
