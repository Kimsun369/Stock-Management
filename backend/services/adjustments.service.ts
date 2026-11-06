import { getAllRows, appendRow, updateRowById, appendAuditLog, generateId, SHEETS } from '@/backend/sheets'
import { AdjustmentRequest, AdjustmentStatus } from '@/backend/types'
import { normalizeUnitPair } from '@/backend/unit-config'

export async function getAdjustments(status?: string): Promise<AdjustmentRequest[]> {
  const [adjRows, prodRows, userRows, categoryRows] = await Promise.all([
    getAllRows(SHEETS.AdjustmentRequests),
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Users),
    getAllRows(SHEETS.Categories),
  ])

  const categoryMap = new Map(categoryRows.map((c) => [c.id, `${c.name || ''} ${c.nameKm || ''}`]))
  const prodMap = new Map(prodRows.map((p) => [p.id, normalizeUnitPair(p, categoryMap.get(p.categoryId) || '')]))
  const userMap = new Map(userRows.map((u) => [u.id, u.name]))

  let list: AdjustmentRequest[] = adjRows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: prodMap.get(row.productId)?.name || 'Unknown Product',
    productUnit: prodMap.get(row.productId)?.unit || '',
    productAltUnit: prodMap.get(row.productId)?.altUnit || '',
    productConversionRate: Number(prodMap.get(row.productId)?.conversionRate) || 1,
    currentQuantity: Number(row.currentQuantity) || 0,
    requestedChange: Number(row.requestedChange) || 0,
    reason: row.reason || '',
    notes: row.notes || '',
    status: row.status as AdjustmentStatus,
    submittedByUserId: row.submittedByUserId || '',
    submittedByName: userMap.get(row.submittedByUserId) || 'Staff',
    reviewedByUserId: row.reviewedByUserId || '',
    reviewedByName: userMap.get(row.reviewedByUserId) || '',
    reviewNotes: row.reviewNotes || '',
    createdAt: row.createdAt || '',
    reviewedAt: row.reviewedAt || '',
  }))

  if (status && status !== 'ALL') {
    list = list.filter((a) => a.status === status)
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return list
}

export async function requestAdjustment(params: {
  productId: string
  requestedChange: number
  reason: string
  notes?: string
  userId: string
  userName: string
}): Promise<AdjustmentRequest> {
  if (params.requestedChange === 0) {
    throw new Error('Requested change cannot be zero')
  }
  if (!params.reason.trim()) throw new Error('Adjustment reason is required')

  const products = await getAllRows(SHEETS.Products)
  const product = products.find((p) => p.id === params.productId && p.active === 'true')
  if (!product) throw new Error('PRODUCT_NOT_FOUND')

  const currentQty = Number(product.physicalStock) || 0
  const resultingBalance = currentQty + params.requestedChange
  if (resultingBalance < 0) {
    throw new Error('Adjustment cannot result in negative inventory')
  }

  const id = generateId()
  const now = new Date().toISOString()

  await updateRowById(SHEETS.Products, product.id, {
    physicalStock: String(resultingBalance),
  })

  await appendRow(SHEETS.StockTransactions, [
    generateId(),
    product.id,
    'ADJUSTMENT',
    String(Math.abs(params.requestedChange)),
    String(currentQty),
    String(resultingBalance),
    String((Number(product.purchaseCost) || 0) / (Number(product.conversionRate) > 1 ? Number(product.conversionRate) : 1)),
    'USD',
    `ADJ-${id.slice(-6)}`,
    `Count Correction: ${params.reason}`,
    params.notes || '',
    params.userId,
    now,
  ])

  await appendRow(SHEETS.AdjustmentRequests, [
    id,
    product.id,
    String(currentQty),
    String(params.requestedChange),
    params.reason,
    params.notes || '',
    'APPROVED',
    params.userId,
    params.userId, // Applied immediately; no admin approval needed.
    'Applied immediately by staff',
    now,
    now,
  ])

  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'ADJUSTMENT_APPLIED',
    entityType: 'StockAdjustmentRequest',
    entityId: id,
    details: `Applied adjustment of ${params.requestedChange > 0 ? '+' : ''}${params.requestedChange} for ${product.name} (${currentQty} -> ${resultingBalance}; Reason: ${params.reason})`,
  })

  return {
    id,
    productId: product.id,
    productName: product.name,
    currentQuantity: currentQty,
    requestedChange: params.requestedChange,
    reason: params.reason,
    notes: params.notes || '',
    status: 'APPROVED',
    submittedByUserId: params.userId,
    submittedByName: params.userName,
    reviewedByUserId: params.userId,
    reviewNotes: 'Applied immediately by staff',
    createdAt: now,
    reviewedAt: '',
  }
}

export async function reviewAdjustment(params: {
  id: string
  action: 'approve' | 'reject'
  reviewNotes?: string
  userId: string
  userName: string
}): Promise<AdjustmentRequest> {
  const adjustments = await getAllRows(SHEETS.AdjustmentRequests)
  const adj = adjustments.find((a) => a.id === params.id)
  if (!adj) throw new Error('ADJUSTMENT_NOT_FOUND')

  if (adj.status !== 'PENDING') {
    throw new Error('This adjustment has already been reviewed')
  }

  const now = new Date().toISOString()
  const products = await getAllRows(SHEETS.Products)
  const product = products.find((p) => p.id === adj.productId)

  if (params.action === 'approve') {
    if (!product) throw new Error('Product not found')

    const currentPhysical = Number(product.physicalStock) || 0
    const change = Number(adj.requestedChange) || 0
    const resultingBalance = currentPhysical + change

    if (resultingBalance < 0) {
      throw new Error('Cannot approve: resulting stock would be negative')
    }

    // 1. Update product physical stock
    await updateRowById(SHEETS.Products, product.id, {
      physicalStock: String(resultingBalance),
    })

    // 2. Append StockTransaction ledger entry
    const txId = generateId()
    await appendRow(SHEETS.StockTransactions, [
      txId,
      product.id,
      'ADJUSTMENT',
      String(Math.abs(change)),
      String(currentPhysical),
      String(resultingBalance),
      String((Number(product.purchaseCost) || 0) / (Number(product.conversionRate) > 1 ? Number(product.conversionRate) : 1)),
      'USD',
      `ADJ-${adj.id.slice(-6)}`,
      `Count Correction: ${adj.reason}`,
      params.reviewNotes || adj.notes || '',
      params.userId,
      now,
    ])

    // 3. Mark adjustment approved
    await updateRowById(SHEETS.AdjustmentRequests, adj.id, {
      status: 'APPROVED',
      reviewedByUserId: params.userId,
      reviewNotes: params.reviewNotes || 'Approved by Admin',
      reviewedAt: now,
    })

    await appendAuditLog({
      actorId: params.userId,
      actorName: params.userName,
      action: 'ADJUSTMENT_APPROVED',
      entityType: 'StockAdjustmentRequest',
      entityId: adj.id,
      details: `Approved stock adjustment for ${product.name}: ${change > 0 ? '+' : ''}${change} (Balance: ${currentPhysical} -> ${resultingBalance})`,
    })
  } else {
    // Rejected
    await updateRowById(SHEETS.AdjustmentRequests, adj.id, {
      status: 'REJECTED',
      reviewedByUserId: params.userId,
      reviewNotes: params.reviewNotes || 'Rejected by Admin',
      reviewedAt: now,
    })

    await appendAuditLog({
      actorId: params.userId,
      actorName: params.userName,
      action: 'ADJUSTMENT_REJECTED',
      entityType: 'StockAdjustmentRequest',
      entityId: adj.id,
      details: `Rejected stock adjustment request for ${product?.name || adj.productId}. Notes: ${params.reviewNotes || 'None'}`,
    })
  }

  const updated = (await getAdjustments()).find((a) => a.id === params.id)
  return updated!
}

