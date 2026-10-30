import { getAllRows, SHEETS } from '@/backend/sheets'
import { DashboardMetrics, StockTransaction, CustomerRecordWithItems, TransactionType, LeftoverStatus } from '@/backend/types'
import { maskPhoneNumber } from '@/backend/phone'

export type DashboardPeriod = 'today' | 'thisWeek' | 'thisMonth'

export async function getDashboardMetrics(selectedPeriod: DashboardPeriod = 'thisMonth'): Promise<DashboardMetrics & {
  stockMovementChart: Array<{ date: string; stockIn: number; stockOut: number }>
  purchaseTrendChart: Array<{ period: string; spend: number }>
  categoryStockChart: Array<{ name: string; nameKm: string; count: number; units: number; percentage: number }>
}> {
  const [productRows, catRows, txRows, leftoverRows, itemRows, purRows, userRows] = await Promise.all([
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Categories),
    getAllRows(SHEETS.StockTransactions),
    getAllRows(SHEETS.CustomerRecords),
    getAllRows(SHEETS.CustomerItems),
    getAllRows(SHEETS.PurchaseRecords),
    getAllRows(SHEETS.Users),
  ])

  // Active products & stock totals
  const activeProducts = productRows.filter((p) => p.active === 'true')
  let totalAvailableStock = 0
  let totalReservedStock = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const p of activeProducts) {
    const physical = Number(p.physicalStock) || 0
    const reserved = Number(p.reservedStock) || 0
    const available = Math.max(0, physical - reserved)
    const min = Number(p.minStock) || 5

    totalAvailableStock += available
    totalReservedStock += reserved

    if (available <= 0) {
      outOfStockCount++
    } else if (available <= min) {
      lowStockCount++
    }
  }

  // Current calendar boundaries
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  
  const dayOfWeek = now.getDay()
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday).getTime()
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime()

  const isToday = (dateStr: string) => {
    if (!dateStr) return false
    return dateStr.slice(0, 10) === todayStr || new Date(dateStr).getTime() >= startOfToday
  }
  const isThisWeek = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr).getTime() >= startOfWeek
  }
  const isThisMonth = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr).getTime() >= startOfMonth
  }
  const isThisYear = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr).getTime() >= startOfYear
  }

  // Stock In & Stock Out by period
  let todayStockIn = 0
  let todayStockOut = 0
  let weeklyStockIn = 0
  let weeklyStockOut = 0
  let monthlyStockIn = 0
  let monthlyStockOut = 0

  for (const tx of txRows) {
    const qty = Number(tx.quantity) || 0
    const time = tx.createdAt
    if (tx.type === 'STOCK_IN') {
      if (isToday(time)) todayStockIn += qty
      if (isThisWeek(time)) weeklyStockIn += qty
      if (isThisMonth(time)) monthlyStockIn += qty
    } else if (tx.type === 'STOCK_OUT') {
      if (isToday(time)) todayStockOut += qty
      if (isThisWeek(time)) weeklyStockOut += qty
      if (isThisMonth(time)) monthlyStockOut += qty
    }
  }

  // Purchase Spending by period from actual stock-in purchases
  let todayPurchases = 0
  let weeklyPurchases = 0
  let monthlyPurchases = 0
  let yearlyPurchases = 0

  // 1. Check PurchaseRecords
  for (const pur of purRows) {
    const pDate = pur.purchaseDate || pur.createdAt || ''
    const amount = Number(pur.totalAmount) || 0
    if (isToday(pDate)) todayPurchases += amount
    if (isThisWeek(pDate)) weeklyPurchases += amount
    if (isThisMonth(pDate)) monthlyPurchases += amount
    if (isThisYear(pDate)) yearlyPurchases += amount
  }

  // 2. If PurchaseRecords has no entries, calculate from StockTransactions (STOCK_IN * unitCost)
  if (purRows.length === 0) {
    for (const tx of txRows) {
      if (tx.type === 'STOCK_IN') {
        const cost = (Number(tx.quantity) || 0) * (Number(tx.unitCost) || 0)
        if (isToday(tx.createdAt)) todayPurchases += cost
        if (isThisWeek(tx.createdAt)) weeklyPurchases += cost
        if (isThisMonth(tx.createdAt)) monthlyPurchases += cost
        if (isThisYear(tx.createdAt)) yearlyPurchases += cost
      }
    }
  }

  // Precomputed periods map
  const periods = {
    today: {
      stockIn: todayStockIn,
      stockOut: todayStockOut,
      purchases: Number(todayPurchases.toFixed(2)),
    },
    thisWeek: {
      stockIn: weeklyStockIn,
      stockOut: weeklyStockOut,
      purchases: Number(weeklyPurchases.toFixed(2)),
    },
    thisMonth: {
      stockIn: monthlyStockIn,
      stockOut: monthlyStockOut,
      purchases: Number(monthlyPurchases.toFixed(2)),
    },
  }

  // Selected period values
  const activePeriodData = periods[selectedPeriod] || periods.thisMonth
  const periodStockIn = activePeriodData.stockIn
  const periodStockOut = activePeriodData.stockOut
  const periodPurchases = activePeriodData.purchases

  // Outstanding leftovers
  const outstandingRecords = leftoverRows.filter(
    (r) => r.status === 'HELD' || r.status === 'PARTIALLY_COLLECTED'
  )

  // Chart 1: Stock In vs Stock Out (Last 7 Days)
  const last7Days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().slice(0, 10))
  }

  const stockMovementChart = last7Days.map((day) => {
    let inQty = 0
    let outQty = 0
    for (const tx of txRows) {
      if (tx.createdAt && tx.createdAt.slice(0, 10) === day) {
        const qty = Number(tx.quantity) || 0
        if (tx.type === 'STOCK_IN') inQty += qty
        if (tx.type === 'STOCK_OUT') outQty += qty
      }
    }
    return {
      date: day.slice(5), // MM-DD
      stockIn: inQty,
      stockOut: outQty,
    }
  })

  // Chart 2: Purchase Spending Trend (Last 7 Days)
  const purchaseTrendChart = last7Days.map((day) => {
    let daySpend = 0
    // Try purRows first
    for (const pur of purRows) {
      const pDate = pur.purchaseDate || pur.createdAt || ''
      if (pDate.slice(0, 10) === day) {
        daySpend += Number(pur.totalAmount) || 0
      }
    }
    // If no purRows on that day, check txRows
    if (daySpend === 0) {
      for (const tx of txRows) {
        if (tx.type === 'STOCK_IN' && tx.createdAt && tx.createdAt.slice(0, 10) === day) {
          daySpend += (Number(tx.quantity) || 0) * (Number(tx.unitCost) || 0)
        }
      }
    }
    return {
      period: day.slice(5), // MM-DD
      spend: Number(daySpend.toFixed(2)),
    }
  })

  // Chart 3: Stock by Category (Distribution of currently available stock, no zero-stock categories)
  const categoryAvailable = new Map<string, { count: number; units: number }>()
  for (const p of activeProducts) {
    const cId = p.categoryId || 'other'
    const physical = Number(p.physicalStock) || 0
    const reserved = Number(p.reservedStock) || 0
    const available = Math.max(0, physical - reserved)
    const prev = categoryAvailable.get(cId) || { count: 0, units: 0 }
    categoryAvailable.set(cId, { count: prev.count + 1, units: prev.units + available })
  }

  let totalActiveUnits = 0
  const activeCategoryList: Array<{ name: string; nameKm: string; count: number; units: number }> = []

  for (const c of catRows) {
    if (c.active !== 'true') continue
    const stats = categoryAvailable.get(c.id) || { count: 0, units: 0 }
    if (stats.units > 0) {
      activeCategoryList.push({
        name: c.name,
        nameKm: c.nameKm || c.name,
        count: stats.count,
        units: stats.units,
      })
      totalActiveUnits += stats.units
    }
  }

  const categoryStockChart = activeCategoryList.map((c) => ({
    ...c,
    percentage: totalActiveUnits > 0 ? Number(((c.units / totalActiveUnits) * 100).toFixed(1)) : 0,
  }))

  return {
    // 8 Main Summary Cards
    totalProducts: activeProducts.length,
    totalCategories: catRows.filter((c) => c.active === 'true').length,
    totalAvailableStock,
    totalReservedStock,
    lowStockCount,
    outOfStockCount,
    monthlyStockIn,
    monthlyStockOut,
    monthlyPurchases: Number(monthlyPurchases.toFixed(2)),
    todayPurchases: Number(todayPurchases.toFixed(2)),
    weeklyPurchases: Number(weeklyPurchases.toFixed(2)),
    yearlyPurchases: Number(yearlyPurchases.toFixed(2)),
    outstandingLeftovers: outstandingRecords.length,
    // Period filter data
    period: selectedPeriod,
    periodStockIn,
    periodStockOut,
    periodPurchases: Number(periodPurchases.toFixed(2)),
    periods,
    // 3 Essential Charts
    stockMovementChart,
    purchaseTrendChart,
    categoryStockChart,
  }
}
