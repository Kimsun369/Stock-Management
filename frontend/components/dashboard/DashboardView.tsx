'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  Package,
  Boxes,
  Clock,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  RotateCcw,
  Plus,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useI18n } from '@/lib/i18n-context'
import { StatCard } from '@/frontend/components/ui/StatCard'
import { Button } from '@/frontend/components/ui/Button'
import { useTheme } from '@/lib/theme-context'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const LUXURY_PALETTE = ['#F59E0B', '#E5B824', '#D97706', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4']

type PeriodType = 'today' | 'thisWeek' | 'thisMonth'

export function DashboardView() {
  const { t, language, formatNumber, formatCurrency } = useI18n()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isKm = language === 'km'
  const [period, setPeriod] = useState<PeriodType>('thisMonth')

  const { data, error, isLoading, mutate } = useSWR(`/api/dashboard?period=${period}`, fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800/80 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-84 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl" />
          <div className="h-84 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl" />
          <div className="h-84 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 p-8 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-center text-rose-700 dark:text-rose-400">
        <p className="font-bold text-base">{t('common.error')}</p>
        <Button onClick={() => mutate()} variant="outline" size="md" className="mt-4">
          <RotateCcw className="w-4 h-4" />
          <span>{t('common.refresh')}</span>
        </Button>
      </div>
    )
  }

  // Active period figures
  const periodData = data.periods?.[period] || {
    stockIn: data.periodStockIn || 0,
    stockOut: data.periodStockOut || 0,
    purchases: data.periodPurchases || 0,
  }

  const periodLabel = t(`dashboard.${period}`)

  // Clean data for Stock by Category (filter out categories with zero stock)
  const categoryChartData = (data.categoryStockChart || []).filter((c: any) => c.units > 0)

  // Chart styling colors based on active theme
  const gridColor = isDark ? '#23232C' : '#F1F5F9'
  const textColor = isDark ? '#A1A1AA' : '#64748B'
  const tooltipBg = isDark ? '#16161D' : '#FFFFFF'
  const tooltipBorder = isDark ? '#383844' : '#E2E8F0'

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* 1. Clean, High-Contrast Page Header with Date Filter (No unnecessary top photo banner) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-khmer leading-snug">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-1 font-medium font-khmer">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Period Dropdown Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 bg-white dark:bg-[#111116] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-zinc-400 font-normal">{t('dashboard.filterPeriod')}:</span>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="bg-transparent font-bold text-amber-600 dark:text-amber-400 focus:outline-none cursor-pointer text-sm font-khmer"
            >
              <option value="today" className="bg-white dark:bg-[#16161D] text-zinc-900 dark:text-zinc-100 font-khmer">
                {t('dashboard.today')}
              </option>
              <option value="thisWeek" className="bg-white dark:bg-[#16161D] text-zinc-900 dark:text-zinc-100 font-khmer">
                {t('dashboard.thisWeek')}
              </option>
              <option value="thisMonth" className="bg-white dark:bg-[#16161D] text-zinc-900 dark:text-zinc-100 font-khmer">
                {t('dashboard.thisMonth')}
              </option>
            </select>
          </div>

          {/* New Leftover Button - High Contrast 24K Gold Button with Pitch Black Text */}
          <Link href="/dashboard/customer-leftovers/new" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto font-extrabold text-sm sm:text-base px-5 py-2.5 font-khmer justify-center">
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('customerLeftovers.registerNew') || t('leftovers.newRecord')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. ONLY EIGHT SUMMARY CARDS with Increased Font Legibility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Products */}
        <StatCard
          label={t('dashboard.totalProducts')}
          value={formatNumber(data.totalProducts || 0)}
          icon={Package}
          variant="gold"
        />

        {/* 2. Available Stock */}
        <StatCard
          label={t('dashboard.availableStock')}
          value={formatNumber(data.availableStock || 0)}
          icon={Boxes}
          variant="default"
        />

        {/* 3. Customer-Held Units */}
        <StatCard
          label={t('dashboard.customerHeldUnits')}
          value={formatNumber(data.customerHeldUnits || 0)}
          icon={Clock}
          variant="default"
        />

        {/* 4. Low Stock Alerts */}
        <StatCard
          label={t('dashboard.lowStockAlerts')}
          value={formatNumber(data.lowStockCount || 0)}
          icon={AlertTriangle}
          variant={data.lowStockCount > 0 ? 'danger' : 'default'}
        />

        {/* 5. Stock In */}
        <StatCard
          label={`${t('dashboard.stockIn')} (${periodLabel})`}
          value={formatNumber(periodData.stockIn || 0)}
          icon={ArrowDownToLine}
          variant="success"
        />

        {/* 6. Stock Out */}
        <StatCard
          label={`${t('dashboard.stockOut')} (${periodLabel})`}
          value={formatNumber(periodData.stockOut || 0)}
          icon={ArrowUpFromLine}
          variant="default"
        />

        {/* 7. Spend */}
        <StatCard
          label={`${t('dashboard.spend')} (${periodLabel})`}
          value={formatCurrency(periodData.purchases || 0)}
          icon={Receipt}
          variant="gold"
        />

        {/* 8. Customer Leftovers */}
        <StatCard
          label={t('dashboard.customerLeftovers')}
          value={formatNumber(data.outstandingLeftovers || 0)}
          icon={Clock}
          variant={data.outstandingLeftovers > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* 3. ONLY THREE CHARTS with High Legibility & Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Stock In vs Stock Out (Last 7 Days) */}
        <div className="bg-white dark:bg-[#111116] luxury-card p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
          <div className="mb-5">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-khmer">
              {t('dashboard.stockComparison')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium font-khmer">
              {t('dashboard.last7Days')}
            </p>
          </div>
          <div className="h-68 w-full flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockMovementChart || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: textColor }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: textColor }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: 12,
                    fontSize: 13,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar
                  dataKey="stockIn"
                  fill="#10B981"
                  name={t('dashboard.stockIn')}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="stockOut"
                  fill="#F59E0B"
                  name={t('dashboard.stockOut')}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Purchase Spending Trend (Last 7 Days) */}
        <div className="bg-white dark:bg-[#111116] luxury-card p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
          <div className="mb-5">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-khmer">
              {t('dashboard.spendingTrend')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium font-khmer">
              {t('dashboard.last7Days')}
            </p>
          </div>
          <div className="h-68 w-full flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.purchaseTrendChart || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: textColor }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: textColor }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), t('dashboard.spend')]}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: 12,
                    fontSize: 13,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                />
                <Bar
                  dataKey="spend"
                  fill="#E5B824"
                  name={t('dashboard.spend')}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Stock by Category (Donut Chart) */}
        <div className="bg-white dark:bg-[#111116] luxury-card p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
          <div className="mb-5">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-khmer">
              {t('dashboard.stockByCategory')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium font-khmer">
              {t('dashboard.categoryDistribution')}
            </p>
          </div>
          <div className="h-68 w-full flex-1 min-h-[260px]">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-zinc-400 font-khmer">
                {t('common.noRecords')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="units"
                    nameKey={language === 'km' ? 'nameKm' : 'name'}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name} ${(((percent ?? 0)) * 100).toFixed(0)}%`
                    }
                  >
                    {categoryChartData.map((_: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={LUXURY_PALETTE[idx % LUXURY_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${formatNumber(val)} units`, t('dashboard.availableStock')]}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: 12,
                      fontSize: 13,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
