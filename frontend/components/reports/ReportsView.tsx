'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Download,
  FileSpreadsheet,
  Search,
  RefreshCw,
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
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Badge } from '@/frontend/components/ui/Badge'
import { StatCard } from '@/frontend/components/ui/StatCard'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
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
      return <Badge variant="success">IN</Badge>
    }
    if (s === 'OUT') {
      return <Badge variant="danger">OUT</Badge>
    }
    if (s === 'RETURN') {
      return <Badge variant="info">RETURN</Badge>
    }
    if (s === 'ADJUSTMENT') {
      return <Badge variant="warning">ADJUST</Badge>
    }
    return <Badge variant="neutral">{s}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('reports.title')}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleResetFilters} variant="secondary" size="sm" title="Refresh & Reset">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={handleExportCsv} variant="primary" size="sm">
            <Download className="w-4 h-4" />
            <span>{t('common.exportCsv')} (UTF-8 BOM)</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto gap-1">
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
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
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
              label={t('reports.columns.name') || 'Total Products'}
              value={formatNumber((summaryMetrics as any).totalItems || 0)}
              icon={Boxes}
              variant="default"
            />
            <StatCard
              label={t('reports.columns.availableStock') || 'Available Stock'}
              value={formatNumber((summaryMetrics as any).totalAvailable || 0)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              label={t('reports.columns.inventoryValue') || 'Total Valuation'}
              value={formatCurrency((summaryMetrics as any).totalValue || 0, 'USD')}
              icon={ShoppingCart}
              variant="gold"
            />
            <StatCard
              label="Low / Out of Stock"
              value={formatNumber((summaryMetrics as any).lowOrOut || 0)}
              icon={AlertTriangle}
              variant={(summaryMetrics as any).lowOrOut > 0 ? 'warning' : 'default'}
            />
          </>
        )}

        {reportType === 'movements' && (
          <>
            <StatCard
              label="Total Movements"
              value={formatNumber((summaryMetrics as any).totalMovements || 0)}
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              label="Stock In Total"
              value={formatNumber((summaryMetrics as any).totalIn || 0)}
              icon={ArrowDownLeft}
              variant="success"
            />
            <StatCard
              label="Stock Out Total"
              value={formatNumber((summaryMetrics as any).totalOut || 0)}
              icon={ArrowUpRight}
              variant="danger"
            />
            <StatCard
              label="Returns Total"
              value={formatNumber((summaryMetrics as any).totalReturns || 0)}
              icon={RotateCcw}
              variant="warning"
            />
          </>
        )}

        {reportType === 'purchases' && (
          <>
            <StatCard
              label="Total Spend"
              value={formatCurrency((summaryMetrics as any).totalSpent || 0, 'USD')}
              icon={ShoppingCart}
              variant="gold"
            />
            <StatCard
              label="Purchase Records"
              value={formatNumber((summaryMetrics as any).totalPurchases || 0)}
              icon={Boxes}
              variant="default"
            />
            <StatCard
              label="Average Spend"
              value={formatCurrency((summaryMetrics as any).avgPurchase || 0, 'USD')}
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              label="Suppliers"
              value={formatNumber(suppliers.length)}
              icon={UserCheck}
              variant="default"
            />
          </>
        )}

        {reportType === 'leftovers' && (
          <>
            <StatCard
              label="Active Held"
              value={formatNumber((summaryMetrics as any).heldCount || 0)}
              icon={Archive}
              variant="warning"
            />
            <StatCard
              label="Remaining Quantity"
              value={formatNumber((summaryMetrics as any).totalRemaining || 0)}
              icon={Boxes}
              variant="gold"
            />
            <StatCard
              label="Fully Collected"
              value={formatNumber((summaryMetrics as any).collectedCount || 0)}
              icon={UserCheck}
              variant="success"
            />
            <StatCard
              label="Cancelled / Expired"
              value={formatNumber((summaryMetrics as any).cancelledCount || 0)}
              icon={AlertTriangle}
              variant="default"
            />
          </>
        )}

        {reportType === 'staff' && (
          <>
            <StatCard
              label="Total Activity Logs"
              value={formatNumber((summaryMetrics as any).totalActions || 0)}
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              label="Unique Staff"
              value={formatNumber((summaryMetrics as any).uniqueStaff || 0)}
              icon={UserCheck}
              variant="default"
            />
          </>
        )}
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
        {/* Date presets & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <span className="text-zinc-500 font-medium text-[11px] uppercase tracking-wider shrink-0 mr-1">
              Preset:
            </span>
            {(['all', 'today', 'yesterday', 'last7days', 'thisMonth'] as DatePreset[]).map((p) => {
              const labels: Record<DatePreset, string> = {
                all: 'All Time',
                today: 'Today',
                yesterday: 'Yesterday',
                last7days: 'Last 7 Days',
                thisMonth: 'This Month',
                custom: 'Custom',
              }
              const isActive = datePreset === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetChange(p)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {labels[p]}
                </button>
              )
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in report..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date range inputs & tab-specific filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-36">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleManualStartDate(e.target.value)}
                placeholder={t('reports.startDate')}
              />
            </div>
            <span className="text-xs text-zinc-400">to</span>
            <div className="w-36">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleManualEndDate(e.target.value)}
                placeholder={t('reports.endDate')}
              />
            </div>

            {/* Tab specific dropdown filters */}
            {reportType === 'stock' && categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nameKm ? `(${c.nameKm})` : ''}
                  </option>
                ))}
              </select>
            )}

            {reportType === 'movements' && (
              <select
                value={selectedMovementType}
                onChange={(e) => setSelectedMovementType(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="ALL">All Types</option>
                <option value="IN">Stock In (IN)</option>
                <option value="OUT">Stock Out (OUT)</option>
                <option value="RETURN">Customer Return (RETURN)</option>
                <option value="ADJUSTMENT">Adjustment (ADJUSTMENT)</option>
              </select>
            )}

            {reportType === 'purchases' && suppliers.length > 0 && (
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{t('reports.exportBomNotice')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <TableLoadingCard />
      ) : error ? (
        <div className="p-8 text-center bg-white dark:bg-[#121216] rounded-xl border border-rose-200 dark:border-rose-900/50">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Failed to load report data</p>
          <Button onClick={() => mutate()} variant="secondary" size="sm" className="mt-3">
            Retry
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Boxes className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No records found for this period</p>
          <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or date range</p>
          <Button onClick={handleResetFilters} variant="secondary" size="sm" className="mt-4">
            Reset Filters
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards (sm:hidden) */}
          <div className="block sm:hidden space-y-3">
            {filteredItems.map((item, idx) => {
              const rowId = `mobile-${idx}`
              const isExpanded = !!expandedRows[rowId]

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {item.name || item.product || item.customerName || item.staff || item.receiptNumber}
                      </p>
                      {item.nameKm && <p className="text-[11px] text-zinc-400">{item.nameKm}</p>}
                    </div>
                    {item.status ? renderStatusBadge(item.status) : item.type ? renderStatusBadge(item.type) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    {reportType === 'stock' && (
                      <>
                        <div>
                          <span className="text-zinc-400">Available: </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {formatStockQuantity(Number(item.availableStock) || 0, item.unit, item.altUnit, item.conversionRate, (k) => t(k))}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Valuation: </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.inventoryValue || 0, 'USD')}
                          </span>
                        </div>
                      </>
                    )}

                    {reportType === 'movements' && (
                      <>
                        <div>
                          <span className="text-zinc-400">Qty: </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Date: </span>
                          <span className="text-zinc-600 dark:text-zinc-400">{item.date}</span>
                        </div>
                      </>
                    )}

                    {reportType === 'purchases' && (
                      <>
                        <div>
                          <span className="text-zinc-400">Qty: </span>
                          <span className="font-semibold">{item.quantity} {item.unit}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Total: </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.totalAmount || 0, 'USD')}
                          </span>
                        </div>
                      </>
                    )}

                    {reportType === 'leftovers' && (
                      <>
                        <div>
                          <span className="text-zinc-400">Receipt: </span>
                          <span className="font-mono">{item.receiptNumber}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Remaining: </span>
                          <span className="font-bold">{item.totalRemainingQty}</span>
                        </div>
                      </>
                    )}

                    {reportType === 'staff' && (
                      <>
                        <div>
                          <span className="text-zinc-400">Action: </span>
                          <span className="font-semibold">{item.action}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Time: </span>
                          <span>{item.timestamp}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expand button for secondary details */}
                  <button
                    type="button"
                    onClick={() => toggleRow(rowId)}
                    className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 pt-1 font-medium"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{isExpanded ? 'Less details' : 'More details'}</span>
                  </button>

                  {isExpanded && (
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-[11px] space-y-1 text-zinc-600 dark:text-zinc-400">
                      {reportType === 'stock' && (
                        <>
                          <p>Physical Stock: {item.physicalStock} {item.unit}</p>
                          <p>Customer Reserved: {item.reservedStock} {item.unit}</p>
                          <p>Unit Purchase Cost: {formatCurrency(item.costPerUnit || 0, 'USD')}</p>
                          <p>Category: {item.category}</p>
                        </>
                      )}
                      {reportType === 'movements' && (
                        <>
                          <p>Previous Balance: {item.previousBalance}</p>
                          <p>Resulting Balance: {item.resultingBalance}</p>
                          <p>Reference: {item.reference}</p>
                          <p>Reason: {item.reason}</p>
                          <p>Recorded By: {item.recordedBy}</p>
                        </>
                      )}
                      {reportType === 'purchases' && (
                        <>
                          <p>Supplier: {item.supplier}</p>
                          <p>Unit Cost: {formatCurrency(item.unitCost || 0, 'USD')}</p>
                          <p>Invoice #: {item.invoiceNumber}</p>
                          <p>Date: {item.date}</p>
                        </>
                      )}
                      {reportType === 'leftovers' && (
                        <>
                          <p>Customer Phone: {item.customerPhone}</p>
                          <p>Storage Location: {item.storageLocation}</p>
                          <p>Item Types: {item.itemsCount}</p>
                          <p>Stored Date: {item.storedDate}</p>
                          <p>Staff: {item.recordedBy}</p>
                        </>
                      )}
                      {reportType === 'staff' && (
                        <>
                          <p>Record: {item.entity}</p>
                          <p>Details: {item.details}</p>
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
                <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
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
                  {filteredItems.map((row, idx) => {
                    const rowId = `row-${idx}`
                    const isExpanded = !!expandedRows[rowId]

                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRow(rowId)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              title="Toggle details"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>

                          {reportType === 'stock' && (
                            <>
                              <td className="px-4 py-3">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.name}</div>
                                {row.nameKm && <div className="text-[11px] text-zinc-400">{row.nameKm}</div>}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.category}</td>
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
                              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.product}</td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">{renderStatusBadge(row.type)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {row.quantity} {row.unit}
                              </td>
                              <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                {row.previousBalance} → <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.resultingBalance}</span>
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.recordedBy}</td>
                            </>
                          )}

                          {reportType === 'purchases' && (
                            <>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.product}</td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.supplier}</td>
                              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
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
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.customerName}</div>
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
                              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{row.staff}</td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <Badge variant="neutral">{row.action}</Badge>
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{row.entity}</td>
                              <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">{row.details}</td>
                            </>
                          )}
                        </tr>

                        {/* Expandable detail row */}
                        {isExpanded && (
                          <tr className="bg-zinc-50/60 dark:bg-zinc-900/60 text-xs">
                            <td colSpan={7} className="px-6 py-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-1 text-zinc-600 dark:text-zinc-400">
                                {reportType === 'stock' && (
                                  <>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Physical Stock:</span>{' '}
                                      {row.physicalStock} {row.unit}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Customer Reserved:</span>{' '}
                                      {row.reservedStock} {row.unit}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Purchase Unit:</span>{' '}
                                      {row.purchaseUnit}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Package Purchase Cost:</span>{' '}
                                      {formatCurrency(row.purchaseCost || 0, 'USD')}
                                    </div>
                                  </>
                                )}
                                {reportType === 'movements' && (
                                  <>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Reference:</span>{' '}
                                      {row.reference || '—'}
                                    </div>
                                    <div className="col-span-2">
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Reason / Notes:</span>{' '}
                                      {row.reason || '—'}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Previous Balance:</span>{' '}
                                      {row.previousBalance}
                                    </div>
                                  </>
                                )}
                                {reportType === 'purchases' && (
                                  <>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Invoice Number:</span>{' '}
                                      {row.invoiceNumber || '—'}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Currency:</span>{' '}
                                      {row.currency || 'USD'}
                                    </div>
                                  </>
                                )}
                                {reportType === 'leftovers' && (
                                  <>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Storage Location:</span>{' '}
                                      {row.storageLocation || 'Main Storage'}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Recorded By:</span>{' '}
                                      {row.recordedBy || 'Staff'}
                                    </div>
                                  </>
                                )}
                                {reportType === 'staff' && (
                                  <div className="col-span-4">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Full Details:</span>{' '}
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
                <tfoot className="bg-zinc-100/80 dark:bg-zinc-800/80 font-bold border-t-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
                  <tr>
                    <td className="px-3 py-3 text-center">Σ</td>
                    {reportType === 'stock' && (
                      <>
                        <td className="px-4 py-3">Totals ({filteredItems.length} products)</td>
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
                        <td className="px-4 py-3">Total ({filteredItems.length} movements)</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                      </>
                    )}
                    {reportType === 'purchases' && (
                      <>
                        <td className="px-4 py-3">Total ({filteredItems.length} purchases)</td>
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
                        <td className="px-4 py-3">Total ({filteredItems.length} records)</td>
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
                        <td className="px-4 py-3">Total ({filteredItems.length} logs)</td>
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
        </>
      )}
    </div>
  )
}
