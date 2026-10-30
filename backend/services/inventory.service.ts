import { getAllRows, appendRow, updateRowById, appendAuditLog, SHEETS } from '@/backend/sheets'
import { StockTransaction, Product, TransactionType } from '@/backend/types'
import { configuredPurchaseCost, normalizeUnitPair } from '@/backend/unit-config'

export async function getStockLedger(filters?: {
  productId?: string
  type?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<StockTransaction[]> {
  const [txRows, productRows, userRows, categoryRows] = await Promise.all([
    getAllRows(SHEETS.StockTransactions),
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Users),
    getAllRows(SHEETS.Categories),
  ])

  const categoryMap = new Map(categoryRows.map((c) => [c.id, `${c.name || ''} ${c.nameKm || ''}`]))
  const productMap = new Map(productRows.map((p) => [p.id, normalizeUnitPair(p, categoryMap.get(p.categoryId) || '')]))
  const userMap = new Map(userRows.map((u) => [u.id, u.name]))

  let transactions: StockTransaction[] = txRows.map((row) => {
    const product = productMap.get(row.productId)
    return {
      id: row.id,
      productId: row.productId,
      type: row.type as TransactionType,
      quantity: Number(row.quantity) || 0,
      enteredQuantity: row.enteredQuantity ? Number(row.enteredQuantity) : undefined,
      enteredUnit: row.enteredUnit || undefined,
      previousBalance: Number(row.previousBalance) || 0,
      resultingBalance: Number(row.resultingBalance) || 0,
      unitCost: Number(row.unitCost) || 0,
      currency: row.currency || 'USD',
      reference: row.reference || '',
      reason: row.reason || '',
      notes: row.notes || '',
      recordedByUserId: row.recordedByUserId || '',
      createdAt: row.createdAt || '',
      productName: product ? product.name : 'Unknown Product',
      productNameKm: product?.nameKm || '',
      productMainUnit: product?.unit || '',
      productMinorUnit: product?.altUnit || '',
      productConversionRate: Number(product?.conversionRate) || 1,
      recordedByName: userMap.get(row.recordedByUserId) || 'Staff',
    }
  })

  // Apply filters
  if (filters?.productId) {
    transactions = transactions.filter((t) => t.productId === filters.productId)
  }
  if (filters?.type && filters.type !== 'ALL') {
    transactions = transactions.filter((t) => t.type === filters.type)
  }
  if (filters?.startDate) {
    const start = new Date(filters.startDate).getTime()
    transactions = transactions.filter((t) => new Date(t.createdAt).getTime() >= start)
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate).getTime() + 86400000 // include the whole day
    transactions = transactions.filter((t) => new Date(t.createdAt).getTime() <= end)
  }

  // Sort descending by date
  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (filters?.limit && filters.limit > 0) {
    const offset = Math.max(0, filters.offset || 0)
    return transactions.slice(offset, offset + filters.limit)
  }

  return transactions
}

export async function recordStockIn(params: {
  productId: string
  quantity: number
  unit?: string
  supplierId?: string
  unitCost?: number
  currency?: string
  invoiceNumber?: string
  description?: string
  notes?: string
  userId: string
  userName: string
}): Promise<{ transaction: StockTransaction; product: Product }> {
  if (params.quantity <= 0) {
    throw new Error('Quantity must be greater than zero')
  }

  const productRows = await getAllRows(SHEETS.Products)
  const productRow = productRows.find((p) => p.id === params.productId && p.active === 'true')
  if (!productRow) {
    throw new Error('PRODUCT_NOT_FOUND')
  }

  const categoryRows = await getAllRows(SHEETS.Categories)
  const category = categoryRows.find((c) => c.id === productRow.categoryId)
  const units = normalizeUnitPair(productRow, `${category?.name || ''} ${category?.nameKm || ''}`)
  const configuredCost = configuredPurchaseCost(productRow, units)
  // Inventory is stored as a count of the configured minor unit.
  const rawBase = units.unit || 'unit'
  const baseUnit = rawBase.includes('/') ? rawBase.split('/')[0].trim() : rawBase
  const altUnit = units.altUnit || ''
  const conversionRate = Number(productRow.conversionRate) > 1 ? Number(productRow.conversionRate) : 1

  let baseQuantity = params.quantity
  let unitDetail = `${params.quantity} ${baseUnit}`

  if (altUnit && conversionRate > 1 && (!params.unit || params.unit.toLowerCase() === baseUnit.toLowerCase())) {
    baseQuantity = params.quantity * conversionRate
  }
  unitDetail = `${params.quantity} ${params.unit || baseUnit}`

  const currentPhysical = Number(productRow.physicalStock) || 0
  const reserved = Number(productRow.reservedStock) || 0
  const newPhysical = currentPhysical + baseQuantity

  // Important pricing rule: Staff cannot edit purchase price! Use existing configured price.
  const purchasePackageCost = configuredCost
  const unitCost = altUnit && conversionRate > 1 ? purchasePackageCost / conversionRate : purchasePackageCost
  const currency = params.currency || 'USD'
  const now = new Date().toISOString()
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // 1. Update Product physicalStock (purchaseCost is NOT modified here)
  await updateRowById(SHEETS.Products, productRow.id, {
    physicalStock: String(newPhysical),
  })

  // 2. Append StockTransaction ledger entry
  const noteContent = params.description || params.notes || ''
  await appendRow(SHEETS.StockTransactions, [
    txId,
    productRow.id,
    'STOCK_IN',
    String(baseQuantity),
    String(currentPhysical),
    String(newPhysical),
    String(unitCost),
    currency,
    params.invoiceNumber || '',
    'Stock In / Venue Delivery',
    noteContent,
    params.userId,
    now,
    String(params.quantity),
    params.unit || baseUnit,
  ])

  // 3. Append PurchaseRecord for spending calculations
  if (unitCost > 0 || baseQuantity > 0) {
    const purchaseId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const totalAmount = Number((unitCost * baseQuantity).toFixed(2))
    await appendRow(SHEETS.PurchaseRecords, [
      purchaseId,
      productRow.id,
      params.supplierId || productRow.defaultSupplierId || '',
      String(baseQuantity),
      String(unitCost),
      String(totalAmount),
      currency,
      '4100',
      params.invoiceNumber || '',
      now,
      now,
    ])
  }

  // 4. Append AuditLog
  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'STOCK_IN',
    entityType: 'Product',
    entityId: productRow.id,
    details: `Added ${unitDetail} of ${productRow.name}. Stock updated: ${currentPhysical} -> ${newPhysical}`,
  })

  const updatedProduct: Product = {
    id: productRow.id,
    sku: productRow.sku,
    name: productRow.name,
    nameKm: productRow.nameKm || '',
    categoryId: productRow.categoryId,
    brand: productRow.brand || '',
    unit: units.unit || 'can',
    altUnit: units.altUnit || '',
    conversionRate: Number(productRow.conversionRate) || 1,
    purchaseCost: purchasePackageCost,
    physicalStock: newPhysical,
    reservedStock: reserved,
    minStock: Number(productRow.minStock) || 5,
    defaultSupplierId: productRow.defaultSupplierId || '',
    description: productRow.description || '',
    descriptionKm: productRow.descriptionKm || '',
    active: true,
    createdAt: productRow.createdAt,
    updatedAt: now,
  }

  const transaction: StockTransaction = {
    id: txId,
    productId: productRow.id,
    type: 'STOCK_IN',
    quantity: baseQuantity,
    previousBalance: currentPhysical,
    resultingBalance: newPhysical,
    unitCost,
    currency,
    reference: params.invoiceNumber || '',
    reason: params.description || params.notes || 'Stock In / Venue Delivery',
    notes: noteContent,
    recordedByUserId: params.userId,
    createdAt: now,
  }

  return { transaction, product: updatedProduct }
}

export async function recordStockOut(params: {
  productId: string
  quantity: number
  unit?: string
  reason: string
  reference?: string
  notes?: string
  userId: string
  userName: string
}): Promise<{ transaction: StockTransaction; product: Product }> {
  if (params.quantity <= 0) {
    throw new Error('Quantity must be greater than zero')
  }

  const productRows = await getAllRows(SHEETS.Products)
  const productRow = productRows.find((p) => p.id === params.productId && p.active === 'true')
  if (!productRow) {
    throw new Error('PRODUCT_NOT_FOUND')
  }

  const categoryRows = await getAllRows(SHEETS.Categories)
  const category = categoryRows.find((c) => c.id === productRow.categoryId)
  const units = normalizeUnitPair(productRow, `${category?.name || ''} ${category?.nameKm || ''}`)
  const configuredCost = configuredPurchaseCost(productRow, units)
  // Inventory is stored as a count of the configured minor unit.
  const rawBase = units.unit || 'unit'
  const baseUnit = rawBase.includes('/') ? rawBase.split('/')[0].trim() : rawBase
  const altUnit = units.altUnit || ''
  const conversionRate = Number(productRow.conversionRate) > 1 ? Number(productRow.conversionRate) : 1

  let baseQuantity = params.quantity
  let unitDetail = `${params.quantity} ${baseUnit}`

  if (altUnit && conversionRate > 1 && (!params.unit || params.unit.toLowerCase() === baseUnit.toLowerCase())) {
    baseQuantity = params.quantity * conversionRate
  }
  unitDetail = `${params.quantity} ${params.unit || baseUnit}`

  const currentPhysical = Number(productRow.physicalStock) || 0
  const reserved = Number(productRow.reservedStock) || 0
  const available = currentPhysical - reserved

  // Server-side availability validation: prevent dispensing more than available base stock!
  if (available < baseQuantity) {
    throw new Error('INSUFFICIENT_STOCK')
  }

  const newPhysical = currentPhysical - baseQuantity
  const now = new Date().toISOString()
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // 1. Update Product physicalStock (purchaseCost is NOT modified)
  await updateRowById(SHEETS.Products, productRow.id, {
    physicalStock: String(newPhysical),
  })

  // 2. Append StockTransaction ledger entry
  const noteContent = params.notes || ''
  await appendRow(SHEETS.StockTransactions, [
    txId,
    productRow.id,
    'STOCK_OUT',
    String(baseQuantity),
    String(currentPhysical),
    String(newPhysical),
    String(configuredCost / (altUnit && conversionRate > 1 ? conversionRate : 1)),
    'USD',
    params.reference || '',
    params.reason,
    noteContent,
    params.userId,
    now,
    String(params.quantity),
    params.unit || baseUnit,
  ])

  // 3. Append AuditLog
  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'STOCK_OUT',
    entityType: 'Product',
    entityId: productRow.id,
    details: `Dispensed ${unitDetail} of ${productRow.name} (${params.reason}). Stock: ${currentPhysical} -> ${newPhysical}`,
  })

  const updatedProduct: Product = {
    id: productRow.id,
    sku: productRow.sku,
    name: productRow.name,
    nameKm: productRow.nameKm || '',
    categoryId: productRow.categoryId,
    brand: productRow.brand || '',
    unit: units.unit || 'can',
    altUnit: units.altUnit || '',
    conversionRate: Number(productRow.conversionRate) || 1,
    purchaseCost: configuredCost,
    physicalStock: newPhysical,
    reservedStock: reserved,
    minStock: Number(productRow.minStock) || 5,
    defaultSupplierId: productRow.defaultSupplierId || '',
    description: productRow.description || '',
    descriptionKm: productRow.descriptionKm || '',
    active: true,
    createdAt: productRow.createdAt,
    updatedAt: now,
  }

  const transaction: StockTransaction = {
    id: txId,
    productId: productRow.id,
    type: 'STOCK_OUT',
    quantity: baseQuantity,
    previousBalance: currentPhysical,
    resultingBalance: newPhysical,
    unitCost: configuredCost / (altUnit && conversionRate > 1 ? conversionRate : 1),
    currency: 'USD',
    reference: params.reference || '',
    reason: params.reason,
    notes: noteContent,
    recordedByUserId: params.userId,
    createdAt: now,
  }

  return { transaction, product: updatedProduct }
}

export async function recordReturn(params: {
  productId: string
  quantity: number
  unit?: string
  reason: string
  notes?: string
  userId: string
  userName: string
}): Promise<{ transaction: StockTransaction; product: Product }> {
  if (params.quantity <= 0) {
    throw new Error('Quantity must be greater than zero')
  }

  const productRows = await getAllRows(SHEETS.Products)
  const productRow = productRows.find((p) => p.id === params.productId && p.active === 'true')
  if (!productRow) {
    throw new Error('PRODUCT_NOT_FOUND')
  }

  const categoryRows = await getAllRows(SHEETS.Categories)
  const category = categoryRows.find((c) => c.id === productRow.categoryId)
  const units = normalizeUnitPair(productRow, `${category?.name || ''} ${category?.nameKm || ''}`)
  const configuredCost = configuredPurchaseCost(productRow, units)
  const rawBase = units.unit || 'unit'
  const baseUnit = rawBase.includes('/') ? rawBase.split('/')[0].trim() : rawBase
  const altUnit = units.altUnit || ''
  const conversionRate = Number(productRow.conversionRate) > 1 ? Number(productRow.conversionRate) : 1
  const quantity = altUnit && conversionRate > 1 && (!params.unit || params.unit.toLowerCase() === baseUnit.toLowerCase()) ? params.quantity * conversionRate : params.quantity
  const currentPhysical = Number(productRow.physicalStock) || 0
  const reserved = Number(productRow.reservedStock) || 0
  const newPhysical = currentPhysical + quantity
  const now = new Date().toISOString()
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // 1. Add back to physical stock
  await updateRowById(SHEETS.Products, productRow.id, {
    physicalStock: String(newPhysical),
  })

  // 2. Append StockTransaction ledger entry
  await appendRow(SHEETS.StockTransactions, [
    txId,
    productRow.id,
    'RETURN',
    String(quantity),
    String(currentPhysical),
    String(newPhysical),
    String(configuredCost / (altUnit && conversionRate > 1 ? conversionRate : 1)),
    'USD',
    'RETURN-ROOM',
    params.reason,
    params.notes || '',
    params.userId,
    now,
    String(params.quantity),
    params.unit || baseUnit,
  ])

  // 3. Append AuditLog
  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'RETURN',
    entityType: 'Product',
    entityId: productRow.id,
    details: `Returned ${quantity} ${baseUnit} of ${productRow.name} to available inventory (${params.reason})`,
  })

  const updatedProduct: Product = {
    id: productRow.id,
    sku: productRow.sku,
    name: productRow.name,
    nameKm: productRow.nameKm || '',
    categoryId: productRow.categoryId,
    brand: productRow.brand || '',
    unit: units.unit || 'units',
    purchaseCost: configuredCost,
    physicalStock: newPhysical,
    reservedStock: reserved,
    minStock: Number(productRow.minStock) || 5,
    defaultSupplierId: productRow.defaultSupplierId || '',
    description: productRow.description || '',
    descriptionKm: productRow.descriptionKm || '',
    active: true,
    createdAt: productRow.createdAt,
    updatedAt: now,
  }

  const transaction: StockTransaction = {
    id: txId,
    productId: productRow.id,
    type: 'RETURN',
    quantity,
    previousBalance: currentPhysical,
    resultingBalance: newPhysical,
    unitCost: configuredCost / (altUnit && conversionRate > 1 ? conversionRate : 1),
    currency: 'USD',
    reference: 'RETURN-ROOM',
    reason: params.reason,
    notes: params.notes || '',
    recordedByUserId: params.userId,
    createdAt: now,
  }

  return { transaction, product: updatedProduct }
}

