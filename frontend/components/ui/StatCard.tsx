'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'gold'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  variant = 'default',
}: StatCardProps) {
  const iconStyles = {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    gold: 'bg-amber-400/20 text-amber-600 dark:bg-amber-400/25 dark:text-amber-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
  }

  const borderStyles = {
    default: 'hover:border-zinc-300 dark:hover:border-zinc-700',
    gold: 'border-amber-400/35 hover:border-amber-500/60 dark:border-amber-500/25 dark:hover:border-amber-400/50',
    success: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    warning: 'hover:border-amber-300 dark:hover:border-amber-700',
    danger: 'hover:border-rose-300 dark:hover:border-rose-700',
  }

  return (
    <div
      className={`relative bg-white dark:bg-[#111116] luxury-card rounded-2xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all duration-200 ${borderStyles[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400 tracking-wide font-khmer truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${iconStyles[variant]} shadow-2xs shrink-0`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
      {subtitle && (
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2.5 font-semibold font-khmer">
          {subtitle}
        </p>
      )}
    </div>
  )
}
