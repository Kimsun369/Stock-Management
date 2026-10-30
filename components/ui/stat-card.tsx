import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'purple'
  className?: string
  subtitle?: string
}

const variantStyles: Record<string, string> = {
  default: 'border-blue-100 bg-gradient-to-br from-blue-50 to-white',
  warning: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white',
  danger: 'border-red-100 bg-gradient-to-br from-red-50 to-white',
  success: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white',
  purple: 'border-purple-100 bg-gradient-to-br from-purple-50 to-white',
}

const iconVariantStyles: Record<string, string> = {
  default: 'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
  danger: 'bg-red-100 text-red-600',
  success: 'bg-emerald-100 text-emerald-600',
  purple: 'bg-purple-100 text-purple-600',
}

export function StatCard({ title, value, icon, variant = 'default', className, subtitle }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-shadow hover:shadow-md',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2.5 shrink-0 ml-3', iconVariantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
