export type Role = 'ADMIN' | 'STAFF'
export type LeftoverStatus = 'HELD' | 'PARTIALLY_COLLECTED' | 'FULLY_COLLECTED' | 'CANCELLED'
export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'RETURN' | 'ADJUSTMENT' | 'CUSTOMER_RESERVE' | 'CUSTOMER_COLLECT'

export interface User {
  id: string
  name: string
  email: string
  password?: string
  role: Role
  preferredLanguage: string
  numeralSystem: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  nameKm: string
  description: string
  active: boolean
  agreedPurchasePrice?: number
  createdAt: string
  updatedAt: string
  productCount?: number
}

export interface Supplier {
  id: string
  name: string
  nameKm: string
  contactPerson: string
  phone: string
  email: string
  address: string
  notes: string
  active: boolean
  createdAt: string
  updatedAt: string
  totalPurchases?: number
}

export interface Product {
  id: string
  sku: string
  name: string
  nameKm: string
  categoryId: string
  brand: string
  unit: string
  altUnit?: string
  conversionRate?: number
  purchaseCost: number
  physicalStock: number
  reservedStock: number
  minStock: number
  defaultSupplierId: string
  description: string
  descriptionKm: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductWithDetails extends Product {
  availableStock: number
  categoryName?: string
  categoryNameKm?: string
  supplierName?: string
}

export interface StockTransaction {
  id: string
  productId: string
  type: TransactionType
  quantity: number
  enteredQuantity?: number
  enteredUnit?: string
  previousBalance: number
  resultingBalance: number
  unitCost: number
  currency: string
  reference: string
  reason: string
  notes: string
  recordedByUserId: string
  createdAt: string
  productName?: string
  productNameKm?: string
  productMainUnit?: string
  productMinorUnit?: string
  productConversionRate?: number
  recordedByName?: string
}

export interface CustomerRecord {
  id: string
  recordNumber: string
  customerName: string
  customerPhone: string
  normalizedPhone: string
  status: LeftoverStatus
  storageLocation: string
  notes: string
  recordedByUserId: string
  createdAt: string
  updatedAt: string
}

export interface CustomerItem {
  id: string
  recordId: string
  productId: string
  productName: string
  originalQuantity: number
  collectedQuantity: number
  remainingQuantity: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface CollectionTransaction {
  id: string
  recordId: string
  itemId: string
  productId: string
  quantityCollected: number
  staffUserId: string
  notes: string
  createdAt: string
}

export interface CustomerRecordWithItems extends CustomerRecord {
  items: CustomerItem[]
  collections?: CollectionTransaction[]
  itemCount?: number
  totalRemainingQty?: number
  phoneDisplay?: string
  recordedByName?: string
}

export interface AdjustmentRequest {
  id: string
  productId: string
  currentQuantity: number
  requestedChange: number
  reason: string
  notes: string
  status: AdjustmentStatus
  submittedByUserId: string
  reviewedByUserId: string
  reviewNotes: string
  createdAt: string
  reviewedAt: string
  productName?: string
  submittedByName?: string
  reviewedByName?: string
}

export interface PurchaseRecord {
  id: string
  productId: string
  supplierId: string
  quantity: number
  unitCost: number
  totalAmount: number
  currency: string
  exchangeRate: number
  invoiceNumber: string
  purchaseDate: string
  createdAt: string
  productName?: string
  supplierName?: string
}

export interface AuditLog {
  id: string
  actorId: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  details: string
  createdAt: string
}

export interface AppSetting {
  key: string
  value: string
  updatedAt: string
}

export interface DashboardMetrics {
  totalProducts: number
  totalCategories: number
  totalAvailableStock: number
  totalReservedStock: number
  lowStockCount: number
  outOfStockCount: number
  monthlyStockIn: number
  monthlyStockOut: number
  monthlyPurchases: number
  todayPurchases: number
  weeklyPurchases: number
  yearlyPurchases: number
  outstandingLeftovers: number
  // Selected period metrics
  period?: 'today' | 'thisWeek' | 'thisMonth'
  periodStockIn?: number
  periodStockOut?: number
  periodPurchases?: number
  periods?: {
    today: { stockIn: number; stockOut: number; purchases: number }
    thisWeek: { stockIn: number; stockOut: number; purchases: number }
    thisMonth: { stockIn: number; stockOut: number; purchases: number }
  }
  purchaseTrendChart?: Array<{ period: string; spend: number }>
  stockMovementChart?: Array<{ date: string; stockIn: number; stockOut: number }>
  categoryStockChart?: Array<{ name: string; nameKm: string; count: number; units: number }>
  recentTransactions?: StockTransaction[]
  recentLeftovers?: CustomerRecordWithItems[]
}

