'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}: PaginationProps) {
  const { t, language, formatNumber } = useI18n()

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  // Page range numbers (shows around current page)
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-[#121216] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs font-khmer ${className}`}
    >
      {/* Elder-friendly count indicator: Large font & clear high contrast */}
      <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        <span>
          {language === 'km' ? (
            <>
              បង្ហាញ <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{formatNumber(startItem)}</strong> ដល់{' '}
              <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{formatNumber(endItem)}</strong> នៃ{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-bold">{formatNumber(totalItems)}</strong> សរុប
            </>
          ) : (
            <>
              Showing <strong className="text-zinc-900 dark:text-zinc-100">{startItem}</strong> -{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{endItem}</strong> of{' '}
              <strong className="text-amber-600 dark:text-amber-400">{totalItems}</strong> records
            </>
          )}
        </span>

        {/* Optional Page Size Selector */}
        {onItemsPerPageChange && (
          <div className="hidden md:flex items-center gap-1.5 ml-2 border-l border-zinc-200 dark:border-zinc-700 pl-3">
            <span className="text-xs text-zinc-400">
              {language === 'km' ? 'ក្នុងមួយទំព័រ:' : 'Per page:'}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              aria-label={language === 'km' ? 'ចំនួនកំណត់ត្រាក្នុងមួយទំព័រ' : 'Records per page'}
              className="h-8 px-2 text-xs font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz}>
                  {formatNumber(sz)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Elder-friendly Navigation Buttons: Large touch-friendly targets (min-h: 44px) */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => canPrev && onPageChange(currentPage - 1)}
          disabled={!canPrev}
          aria-label={language === 'km' ? 'ទំព័រមុន' : 'Previous page'}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs select-none ${
            canPrev
              ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 active:scale-95 cursor-pointer border border-zinc-200 dark:border-zinc-700'
              : 'bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-transparent'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{language === 'km' ? 'មុន' : 'Prev'}</span>
        </button>

        {/* Numbered Page Buttons for Desktop */}
        <div className="hidden sm:flex items-center gap-1.5">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-zinc-400 font-bold select-none">
                  …
                </span>
              )
            }
            const pageNum = Number(p)
            const isActive = pageNum === currentPage
            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[44px] min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 border border-amber-600'
                    : 'bg-white dark:bg-[#18181D] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80'
                }`}
              >
                {formatNumber(pageNum)}
              </button>
            )
          })}
        </div>

        {/* Mobile Page Indicator */}
        <div className="sm:hidden px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
          {formatNumber(currentPage)} / {formatNumber(totalPages)}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => canNext && onPageChange(currentPage + 1)}
          disabled={!canNext}
          aria-label={language === 'km' ? 'ទំព័របន្ទាប់' : 'Next page'}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs select-none ${
            canNext
              ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 active:scale-95 cursor-pointer border border-zinc-200 dark:border-zinc-700'
              : 'bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-transparent'
          }`}
        >
          <span>{language === 'km' ? 'បន្ទាប់' : 'Next'}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
