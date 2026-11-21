'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ArrowRight, Hand } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'

interface ScrollableTableProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
  showHint?: boolean
  /** The rightmost Actions column stays fixed while the other columns scroll. */
  stickyActions?: boolean
  /** The first column stays fixed while the other columns scroll. */
  stickyFirstColumn?: boolean
}

export function ScrollableTable({
  children,
  className,
  containerClassName,
  showHint = true,
  stickyActions = false,
  stickyFirstColumn = false,
}: ScrollableTableProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 4
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    setHasOverflow(overflow)
    setCanScrollLeft(el.scrollLeft > 6)
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 6)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return

    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => checkScroll())
      observer.observe(el)
      if (el.firstElementChild) {
        observer.observe(el.firstElementChild)
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (observer) observer.disconnect()
    }
  }, [checkScroll])

  return (
    <div className={cn('relative w-full space-y-2', className)}>
      {hasOverflow && showHint && (
        <div role="note" className="scroll-notice relative flex min-h-12 items-center gap-3 overflow-hidden rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-blue-950 shadow-sm dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100">
          <span className="scroll-notice-content flex items-center gap-3">
            <Hand className="scroll-notice-icon h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
            <span className="text-sm font-bold sm:text-base">{t('common.scrollHint')}</span>
            <ArrowRight className="scroll-notice-arrow h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
          </span>
        </div>
      )}
      {/* Table Card Container */}
      <div
        data-has-overflow={hasOverflow}
        data-sticky-actions={stickyActions}
        data-sticky-first-column={stickyFirstColumn}
        className={cn(
          'scrollable-table-frame relative bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden',
          containerClassName
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-4 bg-gradient-to-r from-black/5 to-transparent dark:from-white/5 transition-opacity duration-300',
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />
        {!stickyActions && (
          <div
            className={cn(
              'pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-4 bg-gradient-to-l from-black/5 to-transparent dark:from-white/5 transition-opacity duration-300',
              canScrollRight ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden="true"
          />
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="overflow-x-auto w-full custom-scrollbar scroll-smooth"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
