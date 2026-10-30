'use client'

import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold' | 'gold-dark'
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const styles = {
    gold: 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-zinc-950 font-extrabold border border-amber-300 shadow-2xs',
    'gold-dark': 'bg-[#181820] text-amber-400 font-bold border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 font-semibold',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 font-semibold',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700/60 font-semibold',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700/60 font-semibold',
    neutral: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 font-medium',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
