'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Download,
  FileSpreadsheet,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Boxes,
  TrendingUp,
  ShoppingCart,
  Archive,
  UserCheck,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Calendar,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Badge } from '@/frontend/components/ui/Badge'
import { StatCard } from '@/frontend/components/ui/StatCard'
import { Select } from '@/frontend/components/ui/Select'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
import { Pagination } from '@/frontend/components/ui/Pagination'
import { formatStockQuantity } from '@/lib/unit-labels'
import { getPresetDateRange } from '@/lib/business-day'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type ReportType = 'stock' | 'movements' | 'purchases' | 'leftovers' | 'staff'
type DatePreset = 'all' | 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'custom'

export function ReportsView() {
  const { t, language, formatCurrency, formatNumber } = useI18n()

  const [reportType, setReportType] = useState<ReportType>('stock')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedMovementType, setSelectedMovementType] = useState<string>('ALL')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Fetch ancillary data for filter dropdowns
  const { data: categoriesData } = useSWR('/api/categories', fetcher)
  const { data: suppliersData } = useSWR('/api/suppliers', fetcher)

  const categories = Array.isArray(categoriesData) ? categoriesData : []
  const suppliers = Array.isArray(suppliersData) ? suppliersData : []

  // Build query params for report endpoint
  const queryParams = new URLSearchParams({
    type: reportType,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(selectedCategory && selectedCategory !== 'ALL' ? { categoryId: selectedCategory } : {}),
    ...(selectedSupplier && selectedSupplier !== 'ALL' ? { supplierId: selectedSupplier } : {}),
  })

  const { data, isLoading, error, mutate } = useSWR(`/api/reports?${queryParams.toString()}`, fetcher)

  const rawItems: any[] = Array.isArray(data) ? data : []

  // Date preset selector handler
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
      return
    }
    if (preset === 'custom') {
      return
    }
    const range = getPresetDateRange(preset)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }

  // Handle manual date edits
  const handleManualStartDate = (val: string) => {
    setStartDate(val)
    setDatePreset('custom')
  }
  const handleManualEndDate = (val: string) => {
    setEndDate(val)
    setDatePreset('custom')
  }

  // Handle CSV export
  const handleExportCsv = () => {
    const exportParams = new URLSearchParams({
      type: reportType,
      format: 'csv',
      lang: language,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(selectedCategory && selectedCategory !== 'ALL' ? { categoryId: selectedCategory } : {}),
      ...(selectedSupplier && selectedSupplier !== 'ALL' ? { supplierId: selectedSupplier } : {}),
    })
    window.location.href = `/api/reports?${exportParams.toString()}`
  }

  // Reset filters
  const handleResetFilters = () => {
    setDatePreset('all')
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
    setSelectedCategory('ALL')
    setSelectedMovementType('ALL')
    setSelectedSupplier('ALL')
    mutate()
  }

  // Toggle row expansion for secondary details
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Category options for dropdown
  const categoryOptions = useMemo(() => [
    { value: 'ALL', label: t('reports.allCategories') },
    ...categories.map((c: any) => ({
      value: c.id,
      label: language === 'km' && c.nameKm ? `${c.nameKm} (${c.name})` : c.name,
    })),
  ], [categories, language, t])

  // Movement type options for dropdown
  const movementTypeOptions = useMemo(() => [
    { value: 'ALL', label: t('reports.allTypes') },
    { value: 'IN', label: `${t('nav.stockIn')} (IN)` },
    { value: 'OUT', label: `${t('nav.stockOut')} (OUT)` },
    { value: 'RETURN', label: `${t('nav.returnedItems')} (RETURN)` },
    { value: 'ADJUSTMENT', label: `${t('adjustments.title')} (ADJUST)` },
  ], [t])

  // Supplier options for dropdown
  const supplierOptions = useMemo(() => [
    { value: 'ALL', label: t('reports.allSuppliers') },
    ...suppliers.map((s: any) => ({
      value: s.id,
      label: s.name,
    })),
  ], [suppliers, t])

  // Client-side filtering (search query & movement type)
  const filteredItems = useMemo(() => {
    let list = rawItems

    // Filter by movement type if on movements tab
    if (reportType === 'movements' && selectedMovementType !== 'ALL') {
      list = list.filter((it) => it.type === selectedMovementType)
    }

    // Filter by client search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((it) => {
        return Object.values(it).some((v) => {
          if (v === null || v === undefined) return false
          return String(v).toLowerCase().includes(q)
        })
      })
    }

    return list
  }, [rawItems, reportType, selectedMovementType, searchQuery])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    if (reportType === 'stock') {
      const totalItems = filteredItems.length
      const totalAvailable = filteredItems.reduce((acc, it) => acc + (Number(it.availableStock) || 0), 0)
      const totalValue = filteredItems.reduce((acc, it) => acc + (Number(it.inventoryValue) || 0), 0)
      const lowOrOut = filteredItems.filter((it) => it.status !== 'In Stock').length
      return { totalItems, totalAvailable, totalValue, lowOrOut }
    }

    if (reportType === 'movements') {
      const totalMovements = filteredItems.length
      const totalIn = filteredItems.filter((it) => it.type === 'IN').reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
      const totalOut = filteredItems.filter((it) => it.type === 'OUT').reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
      const totalReturns = filteredItems.filter((it) => it.type === 'RETURN').reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
      return { totalMovements, totalIn, totalOut, totalReturns }
    }

    if (reportType === 'purchases') {
      const totalPurchases = filteredItems.length
      const totalSpent = filteredItems.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0)
      const avgPurchase = totalPurchases > 0 ? totalSpent / totalPurchases : 0
      return { totalPurchases, totalSpent, avgPurchase }
    }

    if (reportType === 'leftovers') {
      const heldCount = filteredItems.filter((it) => it.status === 'HELD' || it.status === 'PARTIALLY_COLLECTED').length
      const totalRemaining = filteredItems.reduce((acc, it) => acc + (Number(it.totalRemainingQty) || 0), 0)
      const collectedCount = filteredItems.filter((it) => it.status === 'COLLECTED').length
      const cancelledCount = filteredItems.filter((it) => it.status === 'CANCELLED' || it.status === 'EXPIRED').length
      return { heldCount, totalRemaining, collectedCount, cancelledCount }
    }

    if (reportType === 'staff') {
      const totalActions = filteredItems.length
      const uniqueStaff = new Set(filteredItems.map((it) => it.staff)).size
      return { totalActions, uniqueStaff }
    }

    return {}
  }, [reportType, filteredItems])

  const tabs: Array<{ id: ReportType; label: string; icon: any }> = [
    { id: 'stock', label: t('reports.tabStock'), icon: Boxes },
    { id: 'movements', label: t('reports.tabMovements'), icon: TrendingUp },
    { id: 'purchases', label: t('reports.tabPurchases'), icon: ShoppingCart },
    { id: 'leftovers', label: t('reports.tabLeftovers'), icon: Archive },
    { id: 'staff', label: t('reports.tabStaff'), icon: UserCheck },
  ]

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    const s = String(status || '')
    if (s === 'In Stock') {
      return <Badge variant="success">{t('products.inStock')}</Badge>
    }
    if (s === 'Low Stock') {
      return <Badge variant="warning">{t('products.lowStock')}</Badge>
    }
    if (s === 'Out of Stock') {
      return <Badge variant="danger">{t('products.outOfStock')}</Badge>
    }
    if (s === 'HELD') {
      return <Badge variant="warning">{t('customerLeftovers.statuses.HELD')}</Badge>
    }
    if (s === 'PARTIALLY_COLLECTED') {
      return <Badge variant="info">{t('customerLeftovers.statuses.PARTIALLY_COLLECTED')}</Badge>
    }
    if (s === 'COLLECTED') {
      return <Badge variant="success">{t('customerLeftovers.statuses.COLLECTED')}</Badge>
    }
    if (s === 'CANCELLED' || s === 'EXPIRED') {
      return <Badge variant="neutral">{s}</Badge>
    }
    if (s === 'IN') {
      return <Badge variant="success">{t('nav.stockIn')}</Badge>
    }
    if (s === 'OUT') {
      return <Badge variant="danger">{t('nav.stockOut')}</Badge>
    }
    if (s === 'RETURN') {
      return <Badge variant="info">{t('nav.returnedItems')}</Badge>
    }
    if (s === 'ADJUSTMENT') {
      return <Badge variant="warning">{t('adjustments.title')}</Badge>
    }
    return <Badge variant="neutral">{s}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-khmer">
            {t('reports.title')}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-khmer">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleResetFilters} variant="secondary" size="sm" title={t('reports.resetFilters')}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-khmer">{t('reports.resetFilters')}</span>
          </Button>
          <Button onClick={handleExportCsv} variant="primary" size="sm">
            <Download className="w-4 h-4" />
            <span className="font-khmer">{t('common.exportCsv')} (UTF-8 BOM)</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto gap-1 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = reportType === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setReportType(tab.id)
                setExpandedRows({})
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors font-khmer ${
                isActive
                  ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {reportType === 'stock' && (
          <>
            <StatCard
              label={t('reports.columns.name')}
              value={formatNumber((summaryMetrics as any).totalItems || 0)}
              icon={Boxes}
              variant="default"
            />
            <StatCard
              label={t('reports.columns.availableStock')}
              value={formatNumber((summaryMetrics as any).totalAvailable || 0)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              label={t('reports.totalValuation')}
              value={formatCurrency((summaryMetrics as any).totalValue || 0, 'USD')}
              icon={ShoppingCart}
              variant="gold"
            />
            <StatCard
              label={t('reports.lowOrOut')}
              value={formatNumber((summaryMetrics as any).lowOrOut || 0)}
              icon={AlertTriangle}
              variant={(summaryMetrics as any).lowOrOut > 0 ? 'warning' : 'default'}
            />
          </>
        )}

        {reportType === 'movements' && (
          <>
            <StatCard
              label={t('reports.totalMovements')}
              value={formatNumber((summaryMetrics as any).totalMovements || 0)}
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              label={t('reports.stockInTotal')}
              value={formatNumber((summaryMetrics as any).totalIn || 0)}
              icon={ArrowDownLeft}
              variant="success"
            />
            <StatCard
              label={t('reports.stockOutTotal')}
              value={formatNumber((summaryMetrics as any).totalOut || 0)}
              icon={ArrowUpRight}
              variant="danger"
            />
            <StatCard
              label={t('reports.returnsTotal')}
              value={formatNumber((summaryMetrics as any).totalReturns || 0)}
              icon={RotateCcw}
              variant="warning"
            />
          </>
        )}

        {reportType === 'purchases' && (
          <>
            <StatCard
              label={t('reports.totalSpend')}
              value={formatCurrency((summaryMetrics as any).totalSpent || 0, 'USD')}
              icon={ShoppingCart}
              variant="gold"
            />
            <StatCard
              label={t('reports.purchaseRecords')}
              value={formatNumber((summaryMetrics as any).totalPurchases || 0)}
              icon={Boxes}
              variant="default"
            />
            <StatCard
              label={t('reports.averageSpend')}
              value={formatCurrency((summaryMetrics as any).avgPurchase || 0, 'USD')}
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              label={t('reports.suppliers')}
              value={formatNumber(suppliers.length)}
              icon={UserCheck}
              variant="default"
            />
          </>
        )}

        {reportType === 'leftovers' && (
          <>
            <StatCard
              label={t('reports.activeHeld')}
              value={formatNumber((summaryMetrics as any).heldCount || 0)}
              icon={Archive}
              variant="warning"
            />
            <StatCard
              label={t('reports.remainingQuantity')}
              value={formatNumber((summaryMetrics as any).totalRemaining || 0)}
              icon={Boxes}
              variant="gold"
            />
            <StatCard
              label={t('reports.fullyCollected')}
              value={formatNumber((summaryMetrics as any).collectedCount || 0)}
              icon={UserCheck}
              variant="success"
            />
            <StatCard
              label={t('reports.cancelledExpired')}
              value={formatNumber((summaryMetrics as any).cancelledCount || 0)}
              icon={AlertTriangle}
              variant="default"
            />
          </>
        )}

        {reportType === 'staff' && (
          <>
            <StatCard
              label={t('reports.totalActivity')}
              value={formatNumber((summaryMetrics as any).totalActions || 0)}
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              label={t('reports.uniqueStaff')}
              value={formatNumber((summaryMetrics as any).uniqueStaff || 0)}
              icon={UserCheck}
              variant="default"
            />
          </>
        )}
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-[#121216] p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
        {/* Row 1: Quick Presets & Search Box */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Presets Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs no-scrollbar">
            <span className="text-zinc-500 dark:text-zinc-400 font-bold text-[11px] uppercase tracking-wider shrink-0 mr-1 font-khmer">
              {t('reports.quickPresets')}:
            </span>
            {(['all', 'today', 'yesterday', 'last7days', 'thisMonth'] as DatePreset[]).map((p) => {
              const isActive = datePreset === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetChange(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-khmer transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-white font-bold shadow-2xs dark:bg-amber-500'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {t(`reports.presets.${p}`)}
                </button>
              )
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('reports.searchPlaceholder')}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500 font-khmer"
            />
          </div>
        </div>

        {/* Row 2: Date inputs & Dropdowns */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-40">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleManualStartDate(e.target.value)}
                  className="w-full h-[38px] px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] text-zinc-900 dark:text-zinc-100 outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                />
              </div>
              <span className="text-xs font-medium text-zinc-400 shrink-0 font-khmer">
                {t('reports.dateTo')}
              </span>
              <div className="relative flex-1 sm:w-40">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleManualEndDate(e.target.value)}
                  className="w-full h-[38px] px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] text-zinc-900 dark:text-zinc-100 outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Tab Specific Dropdown Selectors */}
            {reportType === 'stock' && (
              <div className="w-full sm:w-56">
                <Select
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                />
              </div>
            )}

            {reportType === 'movements' && (
              <div className="w-full sm:w-56">
                <Select
                  options={movementTypeOptions}
                  value={selectedMovementType}
                  onChange={(e) => setSelectedMovementType(e.target.value)}
                />
              </div>
            )}

            {reportType === 'purchases' && (
              <div className="w-full sm:w-56">
                <Select
                  options={supplierOptions}
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Export BOM Notification Note */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-khmer shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('reports.exportBomNotice')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <TableLoadingCard />
      ) : error ? (
        <div className="p-8 text-center bg-white dark:bg-[#121216] rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xs">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 font-khmer">
            {t('reports.loadFailed')}
          </p>
          <Button onClick={() => mutate()} variant="secondary" size="sm" className="mt-3 font-khmer">
            {t('reports.retry')}
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#121216] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <Boxes className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 font-khmer">
            {t('reports.noRecordsFound')}
          </p>
          <p className="text-xs text-zinc-400 mt-1 font-khmer">
            {t('reports.noRecordsHint')}
          </p>
          <Button onClick={handleResetFilters} variant="secondary" size="sm" className="mt-4 font-khmer">
            {t('reports.resetFilters')}
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards (sm:hidden) */}
          <div className="block sm:hidden space-y-3">
            {paginatedItems.map((item, idx) => {
              const rowId = `mobile-${idx}`
              const isExpanded = !!expandedRows[rowId]

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {language === 'km' ? (
                        <>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-khmer">
                            {item.nameKm || item.productKm || item.name || item.product || item.customerName || item.staff || item.receiptNumber}
                          </p>
                          {(item.nameKm || item.productKm) && (item.name || item.product) && (
                            <p className="text-[11px] text-zinc-400 font-medium">{item.name || item.product}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {item.name || item.product || item.customerName || item.staff || item.receiptNumber}
                          </p>
                          {(item.nameKm || item.productKm) && (
                            <p className="text-[11px] text-zinc-400 font-khmer">{item.nameKm || item.productKm}</p>
                          )}
                        </>
                      )}
                    </div>
                    {item.status ? renderStatusBadge(item.status) : item.type ? renderStatusBadge(item.type) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    {reportType === 'stock' && (
                      <>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.availableStock')}: </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {formatStockQuantity(Number(item.availableStock) || 0, item.unit, item.altUnit, item.conversionRate, (k) => t(k))}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.inventoryValue')}: </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.inventoryValue || 0, 'USD')}
                          </span>
                        </div>
                      </>
                    )}

                    {reportType === 'movements' && (
                      <>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.quantity')}: </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.date')}: </span>
                          <span className="text-zinc-600 dark:text-zinc-400">{item.date}</span>
                        </div>
                      </>
                    )}

                    {reportType === 'purchases' && (
                      <>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.quantity')}: </span>
                          <span className="font-semibold">{item.quantity} {item.unit}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.totalAmount')}: </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.totalAmount || 0, 'USD')}
                          </span>
                        </div>
                      </>
                    )}

                    {reportType === 'leftovers' && (
                      <>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.receiptNumber')}: </span>
                          <span className="font-mono">{item.receiptNumber}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.totalRemainingQty')}: </span>
                          <span className="font-bold">{item.totalRemainingQty}</span>
                        </div>
                      </>
                    )}

                    {reportType === 'staff' && (
                      <>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.action')}: </span>
                          <span className="font-semibold">{item.action}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 font-khmer">{t('reports.columns.timestamp')}: </span>
                          <span>{item.timestamp}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expand button for secondary details */}
                  <button
                    type="button"
                    onClick={() => toggleRow(rowId)}
                    className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 pt-1 font-semibold font-khmer"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{isExpanded ? t('reports.lessDetails') : t('reports.moreDetails')}</span>
                  </button>

                  {isExpanded && (
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-[11px] space-y-1 text-zinc-600 dark:text-zinc-400 font-khmer">
                      {reportType === 'stock' && (
                        <>
                          <p>{t('reports.columns.physicalStock')}: {item.physicalStock} {item.unit}</p>
                          <p>{t('reports.columns.reservedStock')}: {item.reservedStock} {item.unit}</p>
                          <p>{t('reports.columns.costPerUnit')}: {formatCurrency(item.costPerUnit || 0, 'USD')}</p>
                          <p>{t('reports.columns.category')}: {item.category}</p>
                        </>
                      )}
                      {reportType === 'movements' && (
                        <>
                          <p>{t('reports.columns.previousBalance')}: {item.previousBalance}</p>
                          <p>{t('reports.columns.resultingBalance')}: {item.resultingBalance}</p>
                          <p>{t('reports.columns.reference')}: {item.reference}</p>
                          <p>{t('reports.columns.reason')}: {item.reason}</p>
                          <p>{t('reports.columns.recordedBy')}: {item.recordedBy}</p>
                        </>
                      )}
                      {reportType === 'purchases' && (
                        <>
                          <p>{t('reports.columns.supplier')}: {item.supplier}</p>
                          <p>{t('reports.columns.unitCost')}: {formatCurrency(item.unitCost || 0, 'USD')}</p>
                          <p>{t('reports.columns.invoiceNumber')}: {item.invoiceNumber}</p>
                          <p>{t('reports.columns.date')}: {item.date}</p>
                        </>
                      )}
                      {reportType === 'leftovers' && (
                        <>
                          <p>{t('reports.columns.customerPhone')}: {item.customerPhone}</p>
                          <p>{t('reports.columns.storageLocation')}: {item.storageLocation}</p>
                          <p>{t('reports.columns.itemsCount')}: {item.itemsCount}</p>
                          <p>{t('reports.columns.storedDate')}: {item.storedDate}</p>
                          <p>{t('reports.columns.recordedBy')}: {item.recordedBy}</p>
                        </>
                      )}
                      {reportType === 'staff' && (
                        <>
                          <p>{t('reports.columns.entity')}: {item.entity}</p>
                          <p>{t('reports.columns.details')}: {item.details}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop View: Table with sticky header (hidden sm:block) */}
          <div className="hidden sm:block">
            <ScrollableTable>
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 font-khmer">
                  <tr>
                    <th className="px-3 py-3 w-8"></th>
                    {reportType === 'stock' && (
                      <>
                        <th className="px-4 py-3">{t('reports.columns.name')}</th>
                        <th className="px-4 py-3">{t('reports.columns.category')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.availableStock')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.costPerUnit')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.inventoryValue')}</th>
                        <th className="px-4 py-3 text-center">{t('reports.columns.status')}</th>
                      </>
                    )}
                    {reportType === 'movements' && (
                      <>
                        <th className="px-4 py-3">{t('reports.columns.date')}</th>
                        <th className="px-4 py-3">{t('reports.columns.product')}</th>
                        <th className="px-4 py-3 text-center">{t('reports.columns.type')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.quantity')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.resultingBalance')}</th>
                        <th className="px-4 py-3">{t('reports.columns.recordedBy')}</th>
                      </>
                    )}
                    {reportType === 'purchases' && (
                      <>
                        <th className="px-4 py-3">{t('reports.columns.date')}</th>
                        <th className="px-4 py-3">{t('reports.columns.product')}</th>
                        <th className="px-4 py-3">{t('reports.columns.supplier')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.quantity')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.unitCost')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.totalAmount')}</th>
                      </>
                    )}
                    {reportType === 'leftovers' && (
                      <>
                        <th className="px-4 py-3">{t('reports.columns.receiptNumber')}</th>
                        <th className="px-4 py-3">{t('reports.columns.customerName')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.itemsCount')}</th>
                        <th className="px-4 py-3 text-right">{t('reports.columns.totalRemainingQty')}</th>
                        <th className="px-4 py-3 text-center">{t('reports.columns.status')}</th>
                        <th className="px-4 py-3">{t('reports.columns.storedDate')}</th>
                      </>
                    )}
                    {reportType === 'staff' && (
                      <>
                        <th className="px-4 py-3">{t('reports.columns.timestamp')}</th>
                        <th className="px-4 py-3">{t('reports.columns.staff')}</th>
                        <th className="px-4 py-3 text-center">{t('reports.columns.action')}</th>
                        <th className="px-4 py-3">{t('reports.columns.entity')}</th>
                        <th className="px-4 py-3">{t('reports.columns.details')}</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {paginatedItems.map((row, idx) => {
                    const rowId = `row-${idx}`
                    const isExpanded = !!expandedRows[rowId]

                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRow(rowId)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                              title={t('reports.moreDetails')}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>

                          {reportType === 'stock' && (
                            <>
                              <td className="px-4 py-3">
                                {language === 'km' ? (
                                  <div>
                                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-khmer text-xs sm:text-sm tracking-wide">
                                      {row.nameKm || row.name}
                                    </div>
                                    {row.nameKm && row.name && (
                                      <div className="text-[11px] text-zinc-400 font-medium">
                                        {row.name}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                                      {row.name}
                                    </div>
                                    {row.nameKm && (
                                      <div className="text-[11px] text-zinc-400 font-khmer">
                                        {row.nameKm}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-khmer font-medium">
                                {language === 'km' && row.categoryKm ? row.categoryKm : row.category}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {formatStockQuantity(Number(row.availableStock) || 0, row.unit, row.altUnit, row.conversionRate, (k) => t(k))}
                              </td>
                              <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                {formatCurrency(row.costPerUnit || 0, 'USD')}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {formatCurrency(row.inventoryValue || 0, 'USD')}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {renderStatusBadge(row.status)}
                              </td>
                            </>
                          )}

                          {reportType === 'movements' && (
                            <>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                              <td className="px-4 py-3">
                                {language === 'km' ? (
                                  <div>
                                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-khmer text-xs sm:text-sm">
                                      {row.productKm || row.product}
                                    </div>
                                    {row.productKm && row.product && (
                                      <div className="text-[11px] text-zinc-400 font-medium">{row.product}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                                      {row.product}
                                    </div>
                                    {row.productKm && (
                                      <div className="text-[11px] text-zinc-400 font-khmer">{row.productKm}</div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">{renderStatusBadge(row.type)}</td>
                              <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {row.quantity} {row.unit}
                              </td>
                              <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                {row.previousBalance} → <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.resultingBalance}</span>
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-khmer">{row.recordedBy}</td>
                            </>
                          )}

                          {reportType === 'purchases' && (
                            <>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                              <td className="px-4 py-3">
                                {language === 'km' ? (
                                  <div>
                                    <div className="font-bold text-zinc-900 dark:text-zinc-100 font-khmer text-xs sm:text-sm">
                                      {row.productKm || row.product}
                                    </div>
                                    {row.productKm && row.product && (
                                      <div className="text-[11px] text-zinc-400 font-medium">{row.product}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                                      {row.product}
                                    </div>
                                    {row.productKm && (
                                      <div className="text-[11px] text-zinc-400 font-khmer">{row.productKm}</div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-khmer">{row.supplier}</td>
                              <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                                {row.quantity} {row.unit}
                              </td>
                              <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                {formatCurrency(row.unitCost || 0, 'USD')}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {formatCurrency(row.totalAmount || 0, 'USD')}
                              </td>
                            </>
                          )}

                          {reportType === 'leftovers' && (
                            <>
                              <td className="px-4 py-3 font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {row.receiptNumber}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.customerName}</div>
                                <div className="text-[11px] text-zinc-400">{row.customerPhone}</div>
                              </td>
                              <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">{row.itemsCount}</td>
                              <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                {row.totalRemainingQty}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {renderStatusBadge(row.status)}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.storedDate}</td>
                            </>
                          )}

                          {reportType === 'staff' && (
                            <>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.timestamp}</td>
                              <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap font-khmer">{row.staff}</td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <Badge variant="neutral">{row.action}</Badge>
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-khmer">{row.entity}</td>
                              <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">{row.details}</td>
                            </>
                          )}
                        </tr>

                        {/* Expandable detail row */}
                        {isExpanded && (
                          <tr className="bg-zinc-50/70 dark:bg-zinc-900/70 text-xs">
                            <td colSpan={7} className="px-6 py-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-1 text-zinc-600 dark:text-zinc-400 font-khmer">
                                {reportType === 'stock' && (
                                  <>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.physicalStock')}:</span>{' '}
                                      {row.physicalStock} {row.unit}
                                    </div>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.reservedStock')}:</span>{' '}
                                      {row.reservedStock} {row.unit}
                                    </div>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.purchaseUnit')}:</span>{' '}
                                      {row.purchaseUnit}
                                    </div>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.purchaseCost')}:</span>{' '}
                                      {formatCurrency(row.purchaseCost || 0, 'USD')}
                                    </div>
                                  </>
                                )}
                                {reportType === 'movements' && (
                                  <>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.reference')}:</span>{' '}
                                      {row.reference || '—'}
                                    </div>
                                    <div className="col-span-2">
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.reason')}:</span>{' '}
                                      {row.reason || '—'}
                                    </div>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.previousBalance')}:</span>{' '}
                                      {row.previousBalance}
                                    </div>
                                  </>
                                )}
                                {reportType === 'purchases' && (
                                  <>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.invoiceNumber')}:</span>{' '}
                                      {row.invoiceNumber || '—'}
                                    </div>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.currency')}:</span>{' '}
                                      {row.currency || 'USD'}
                                    </div>
                                  </>
                                )}
                                {reportType === 'leftovers' && (
                                  <>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.storageLocation')}:</span>{' '}
                                      {row.storageLocation || 'Main Storage'}
                                    </div>
                                    <div>
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.recordedBy')}:</span>{' '}
                                      {row.recordedBy || 'Staff'}
                                    </div>
                                  </>
                                )}
                                {reportType === 'staff' && (
                                  <div className="col-span-4">
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{t('reports.columns.details')}:</span>{' '}
                                    {row.details || '—'}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>

                {/* Table Totals Row */}
                <tfoot className="bg-zinc-100/90 dark:bg-zinc-800/90 font-bold border-t-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-khmer">
                  <tr>
                    <td className="px-3 py-3 text-center">Σ</td>
                    {reportType === 'stock' && (
                      <>
                        <td className="px-4 py-3">{t('common.all')} ({filteredItems.length} {t('reports.columns.name')})</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber((summaryMetrics as any).totalAvailable || 0)}
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency((summaryMetrics as any).totalValue || 0, 'USD')}
                        </td>
                        <td className="px-4 py-3 text-center"></td>
                      </>
                    )}
                    {reportType === 'movements' && (
                      <>
                        <td className="px-4 py-3">{t('reports.totalMovements')} ({filteredItems.length})</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                      </>
                    )}
                    {reportType === 'purchases' && (
                      <>
                        <td className="px-4 py-3">{t('reports.purchaseRecords')} ({filteredItems.length})</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency((summaryMetrics as any).totalSpent || 0, 'USD')}
                        </td>
                      </>
                    )}
                    {reportType === 'leftovers' && (
                      <>
                        <td className="px-4 py-3">{t('customerLeftovers.title')} ({filteredItems.length})</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber((summaryMetrics as any).totalRemaining || 0)}
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                      </>
                    )}
                    {reportType === 'staff' && (
                      <>
                        <td className="px-4 py-3">{t('reports.totalActivity')} ({filteredItems.length})</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </ScrollableTable>
          </div>

          {/* Elder-Friendly Big Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
            onItemsPerPageChange={(sz) => {
              setItemsPerPage(sz)
              setCurrentPage(1)
            }}
            pageSizeOptions={[15, 30, 50, 100]}
          />
        </>
      )}
    </div>
  )
}
