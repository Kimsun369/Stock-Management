import {
  getAllRows,
  appendRow,
  updateRowById,
  appendAuditLog,
  generateReceiptNumber,
  generateId,
  SHEETS,
} from '@/backend/sheets'
import {
  CustomerRecord,
  CustomerItem,
  CollectionTransaction,
  CustomerRecordWithItems,
  LeftoverStatus,
} from '@/backend/types'
import { normalizePhoneNumber, maskPhoneNumber } from '@/backend/phone'

export async function getCustomerRecords(filters?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<{ records: CustomerRecordWithItems[]; total: number; page: number; totalPages: number }> {
  const [recordRows, itemRows, userRows] = await Promise.all([
    getAllRows(SHEETS.CustomerRecords),
    getAllRows(SHEETS.CustomerItems),
    getAllRows(SHEETS.Users),
  ])

  const userMap = new Map(userRows.map((u) => [u.id, u.name]))

  // Group items by recordId
  const itemsByRecord = new Map<string, CustomerItem[]>()
  for (const item of itemRows) {
    const rId = item.recordId
    if (!itemsByRecord.has(rId)) {
      itemsByRecord.set(rId, [])
    }
    itemsByRecord.get(rId)!.push({
      id: item.id,
      recordId: item.recordId,
      productId: item.productId,
      productName: item.productName || 'Product',
      originalQuantity: Number(item.originalQuantity) || 0,
      collectedQuantity: Number(item.collectedQuantity) || 0,
      remainingQuantity: Number(item.remainingQuantity) || 0,
      unit: item.unit || 'units',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  }

  let list: CustomerRecordWithItems[] = recordRows.map((r) => {
    const items = itemsByRecord.get(r.id) || []
    const totalRemaining = items.reduce((sum, it) => sum + it.remainingQuantity, 0)
    return {
      id: r.id,
      recordNumber: r.recordNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      normalizedPhone: r.normalizedPhone || normalizePhoneNumber(r.customerPhone),
      phoneDisplay: maskPhoneNumber(r.customerPhone),
      status: r.status as LeftoverStatus,
      storageLocation: r.storageLocation || '',
      notes: r.notes || '',
      recordedByUserId: r.recordedByUserId,
      recordedByName: userMap.get(r.recordedByUserId) || 'Staff',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      items,
      itemCount: items.length,
      totalRemainingQty: totalRemaining,
    }
  })

  // Filter by status
  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter((r) => r.status === filters.status)
  }

  // Filter by search query (phone, receipt #, customer name)
  if (filters?.search && filters.search.trim()) {
    const query = filters.search.trim().toLowerCase()
    const normalizedQuery = normalizePhoneNumber(query)

    list = list.filter((r) => {
      const matchName = r.customerName.toLowerCase().includes(query)
      const matchReceipt = r.recordNumber.toLowerCase().includes(query)
      const matchRawPhone = r.customerPhone.includes(query)
      const matchNormPhone = normalizedQuery ? r.normalizedPhone.includes(normalizedQuery) : false
      const matchItem = r.items.some((it) => it.productName.toLowerCase().includes(query))
      return matchName || matchReceipt || matchRawPhone || matchNormPhone || matchItem
    })
  }

  // Sort descending by creation date
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = list.length
  const page = Math.max(1, filters?.page || 1)
  const limit = Math.max(1, filters?.limit || 20)
  const totalPages = Math.ceil(total / limit) || 1
  const paginated = list.slice((page - 1) * limit, page * limit)

  return { records: paginated, total, page, totalPages }
}

export async function getCustomerRecordById(id: string): Promise<CustomerRecordWithItems | null> {
  const [recordRows, itemRows, collectionRows, productRows, userRows] = await Promise.all([
    getAllRows(SHEETS.CustomerRecords),
    getAllRows(SHEETS.CustomerItems),
    getAllRows(SHEETS.CollectionTransactions),
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Users),
  ])

  const recordRow = recordRows.find((r) => r.id === id || r.recordNumber === id)
  if (!recordRow) return null

  const userMap = new Map(userRows.map((u) => [u.id, u.name]))
  const productMap = new Map(productRows.map((p) => [p.id, p]))

  const items: CustomerItem[] = itemRows
    .filter((it) => it.recordId === recordRow.id)
    .map((it) => {
      const prod = productMap.get(it.productId)
      return {
        id: it.id,
        recordId: it.recordId,
        productId: it.productId,
        productName: prod ? prod.name : it.productName || 'Product',
        originalQuantity: Number(it.originalQuantity) || 0,
        collectedQuantity: Number(it.collectedQuantity) || 0,
        remainingQuantity: Number(it.remainingQuantity) || 0,
        unit: it.unit || 'units',
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      }
    })

  const collections: CollectionTransaction[] = collectionRows
    .filter((c) => c.recordId === recordRow.id)
    .map((c) => ({
      id: c.id,
      recordId: c.recordId,
      itemId: c.itemId,
      productId: c.productId,
      quantityCollected: Number(c.quantityCollected) || 0,
      staffUserId: c.staffUserId,
      notes: c.notes || '',
      createdAt: c.createdAt,
    }))

  const totalRemaining = items.reduce((sum, it) => sum + it.remainingQuantity, 0)

  return {
    id: recordRow.id,
    recordNumber: recordRow.recordNumber,
    customerName: recordRow.customerName,
    customerPhone: recordRow.customerPhone,
    normalizedPhone: recordRow.normalizedPhone || normalizePhoneNumber(recordRow.customerPhone),
    phoneDisplay: recordRow.customerPhone, // full phone on detail view for verified staff
    status: recordRow.status as LeftoverStatus,
    storageLocation: recordRow.storageLocation || '',
    notes: recordRow.notes || '',
    recordedByUserId: recordRow.recordedByUserId,
    recordedByName: userMap.get(recordRow.recordedByUserId) || 'Staff',
    createdAt: recordRow.createdAt,
    updatedAt: recordRow.updatedAt,
    items,
    collections,
    itemCount: items.length,
    totalRemainingQty: totalRemaining,
  }
}

export async function registerCustomerLeftover(params: {
  customerName: string
  customerPhone: string
  storageLocation?: string
  notes?: string
  items: Array<{ productId: string; quantity: number; unit?: string }>
  userId: string
  userName: string
}): Promise<{ record: CustomerRecord; items: CustomerItem[] }> {
  if (!params.customerName.trim()) {
    throw new Error('Customer name is required')
  }
  if (!params.customerPhone.trim()) {
    throw new Error('Customer phone number is required')
  }
  if (!params.items || params.items.length === 0) {
    throw new Error('At least one item must be registered')
  }

  const normalizedPhone = normalizePhoneNumber(params.customerPhone)
  const productRows = await getAllRows(SHEETS.Products)
  const productMap = new Map(productRows.map((p) => [p.id, p]))

  // 1. Validate all products and stock availability
  for (const item of params.items) {
    if (item.quantity <= 0) {
      throw new Error('Item quantity must be greater than zero')
    }
    const product = productMap.get(item.productId)
    if (!product || product.active !== 'true') {
      throw new Error(`Product ${item.productId} not found or inactive`)
    }

    const physical = Number(product.physicalStock) || 0
    const reserved = Number(product.reservedStock) || 0
    const available = physical - reserved

    if (available < item.quantity) {
      throw new Error(`INSUFFICIENT_STOCK: ${product.name} only has ${available} available to reserve`)
    }
  }

  const now = new Date().toISOString()
  const recordId = generateId()
  const recordNumber = generateReceiptNumber()

  // 2. Reserve stock for each product & create CustomerItem records
  const createdItems: CustomerItem[] = []

  for (const item of params.items) {
    const product = productMap.get(item.productId)!
    const currentReserved = Number(product.reservedStock) || 0
    const newReserved = currentReserved + item.quantity

    // Update product reserved stock
    await updateRowById(SHEETS.Products, product.id, {
      reservedStock: String(newReserved),
    })

    const itemId = generateId()
    const itemUnit = item.unit || product.unit || 'can'

    await appendRow(SHEETS.CustomerItems, [
      itemId,
      recordId,
      product.id,
      product.name,
      String(item.quantity),
      '0', // collectedQuantity
      String(item.quantity), // remainingQuantity
      itemUnit,
      now,
      now,
    ])

    createdItems.push({
      id: itemId,
      recordId,
      productId: product.id,
      productName: product.name,
      originalQuantity: item.quantity,
      collectedQuantity: 0,
      remainingQuantity: item.quantity,
      unit: itemUnit,
      createdAt: now,
      updatedAt: now,
    })
  }

  // 3. Create CustomerRecord
  await appendRow(SHEETS.CustomerRecords, [
    recordId,
    recordNumber,
    params.customerName.trim(),
    params.customerPhone.trim(),
    normalizedPhone,
    'HELD',
    params.storageLocation || 'Main Bar Storage',
    params.notes || '',
    params.userId,
    now,
    now,
  ])

  // 4. Audit Log
  const itemSummary = createdItems.map((it) => `${it.originalQuantity} ${it.unit} of ${it.productName}`).join(', ')
  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'REGISTER_CUSTOMER_LEFTOVER',
    entityType: 'CustomerRecord',
    entityId: recordId,
    details: `Registered leftover record ${recordNumber} for ${params.customerName} (${params.customerPhone}). Items: ${itemSummary}`,
  })

  const createdRecord: CustomerRecord = {
    id: recordId,
    recordNumber,
    customerName: params.customerName.trim(),
    customerPhone: params.customerPhone.trim(),
    normalizedPhone,
    status: 'HELD',
    storageLocation: params.storageLocation || 'Main Bar Storage',
    notes: params.notes || '',
    recordedByUserId: params.userId,
    createdAt: now,
    updatedAt: now,
  }

  return { record: createdRecord, items: createdItems }
}

export async function recordCustomerCollection(params: {
  recordId: string
  collections: Array<{ itemId: string; quantity: number }>
  notes?: string
  userId: string
  userName: string
}): Promise<{ record: CustomerRecordWithItems }> {
  const record = await getCustomerRecordById(params.recordId)
  if (!record) {
    throw new Error('RECORD_NOT_FOUND')
  }

  if (record.status === 'FULLY_COLLECTED' || record.status === 'CANCELLED') {
    throw new Error('Cannot collect from a completed or cancelled record')
  }

  const now = new Date().toISOString()
  const productRows = await getAllRows(SHEETS.Products)
  const productMap = new Map(productRows.map((p) => [p.id, p]))

  // 1. Validate collection quantities
  for (const col of params.collections) {
    if (col.quantity <= 0) continue
    const item = record.items.find((it) => it.id === col.itemId)
    if (!item) {
      throw new Error(`Item ${col.itemId} not found in this record`)
    }
    if (col.quantity > item.remainingQuantity) {
      throw new Error(`QUANTITY_EXCEEDS_OUTSTANDING: Cannot collect ${col.quantity}, only ${item.remainingQuantity} remaining`)
    }
  }

  // 2. Process collections: update customer items & release reserved stock
  for (const col of params.collections) {
    if (col.quantity <= 0) continue
    const item = record.items.find((it) => it.id === col.itemId)!
    const product = productMap.get(item.productId)

    const newCollected = item.collectedQuantity + col.quantity
    const newRemaining = item.remainingQuantity - col.quantity

    // Update CustomerItems sheet
    await updateRowById(SHEETS.CustomerItems, item.id, {
      collectedQuantity: String(newCollected),
      remainingQuantity: String(newRemaining),
      updatedAt: now,
    })

    // Release reservation on Products sheet (does NOT increase physical stock, it was already customer's!)
    if (product) {
      const currentReserved = Number(product.reservedStock) || 0
      const newReserved = Math.max(0, currentReserved - col.quantity)
      await updateRowById(SHEETS.Products, product.id, {
        reservedStock: String(newReserved),
      })
    }

    // Append CollectionTransaction
    const txId = generateId()
    await appendRow(SHEETS.CollectionTransactions, [
      txId,
      record.id,
      item.id,
      item.productId,
      String(col.quantity),
      params.userId,
      params.notes || '',
      now,
    ])
  }

  // 3. Determine updated status
  const updatedRecord = await getCustomerRecordById(record.id)
  if (!updatedRecord) throw new Error('Error retrieving updated record')

  const allCollected = updatedRecord.items.every((it) => it.remainingQuantity === 0)
  const newStatus: LeftoverStatus = allCollected ? 'FULLY_COLLECTED' : 'PARTIALLY_COLLECTED'

  await updateRowById(SHEETS.CustomerRecords, record.id, {
    status: newStatus,
    updatedAt: now,
  })

  // 4. Audit Log
  const collectedSummary = params.collections
    .filter((c) => c.quantity > 0)
    .map((c) => {
      const it = record.items.find((i) => i.id === c.itemId)
      return `${c.quantity} ${it?.unit || 'units'} of ${it?.productName}`
    })
    .join(', ')

  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'CUSTOMER_COLLECT',
    entityType: 'CustomerRecord',
    entityId: record.id,
    details: `Customer ${record.customerName} collected items on receipt ${record.recordNumber}: ${collectedSummary}. Status: ${newStatus}`,
  })

  updatedRecord.status = newStatus
  return { record: updatedRecord }
}

export async function cancelCustomerLeftover(params: {
  recordId: string
  reason: string
  userId: string
  userName: string
}): Promise<void> {
  const record = await getCustomerRecordById(params.recordId)
  if (!record) {
    throw new Error('RECORD_NOT_FOUND')
  }

  const now = new Date().toISOString()
  const productRows = await getAllRows(SHEETS.Products)
  const productMap = new Map(productRows.map((p) => [p.id, p]))

  // Release all remaining reservations
  for (const item of record.items) {
    if (item.remainingQuantity > 0) {
      const product = productMap.get(item.productId)
      if (product) {
        const currentReserved = Number(product.reservedStock) || 0
        const newReserved = Math.max(0, currentReserved - item.remainingQuantity)
        await updateRowById(SHEETS.Products, product.id, {
          reservedStock: String(newReserved),
        })
      }

      await updateRowById(SHEETS.CustomerItems, item.id, {
        remainingQuantity: '0',
        updatedAt: now,
      })
    }
  }

  await updateRowById(SHEETS.CustomerRecords, record.id, {
    status: 'CANCELLED',
    notes: `${record.notes} [Cancelled: ${params.reason}]`,
    updatedAt: now,
  })

  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'CANCEL_LEFTOVER',
    entityType: 'CustomerRecord',
    entityId: record.id,
    details: `Cancelled leftover record ${record.recordNumber} for ${record.customerName}. Reason: ${params.reason}`,
  })
}

