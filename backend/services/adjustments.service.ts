import { getAllRows, appendRow, updateRowById, appendAuditLog, generateId, SHEETS } from '@/backend/sheets'
import { AdjustmentRequest, AdjustmentStatus } from '@/backend/types'
import { normalizeUnitPair } from '@/backend/unit-config'

let legacyAdjustmentResolution: Promise<void> | null = null

async function resolveLegacyPendingAdjustments(): Promise<void> {
  if (legacyAdjustmentResolution) return legacyAdjustmentResolution

  legacyAdjustmentResolution = (async () => {
    const [adjustments, products, transactions, users, auditRows] = await Promise.all([
      getAllRows(SHEETS.AdjustmentRequests),
      getAllRows(SHEETS.Products),
      getAllRows(SHEETS.StockTransactions),
      getAllRows(SHEETS.Users),
      getAllRows(SHEETS.AuditLogs),
    ])
    const pending = adjustments
      .filter((row) => row.status === 'PENDING')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const userNames = new Map(users.map((user) => [user.id, user.name]))

    for (const request of pending) {
      const product = products.find((item) => item.id === request.productId)
      const reference = `ADJ-${request.id.slice(-6)}`
      const existingTransaction = transactions.find(
        (item) => item.type === 'ADJUSTMENT' && item.productId === request.productId && item.reference === reference
      )

      if (existingTransaction) {
        const hasLaterTransaction = transactions.some(
          (item) => item.productId === request.productId && item.id !== existingTransaction.id &&
            item.createdAt > existingTransaction.createdAt
        )
        if (
          product && !hasLaterTransaction &&
          Number(product.physicalStock) === Number(existingTransaction.previousBalance)
        ) {
          const repairedBalance = Number(existingTransaction.resultingBalance) || 0
          await updateRowById(SHEETS.Products, product.id, { physicalStock: String(repairedBalance) })
          product.physicalStock = String(repairedBalance)
        }
        await updateRowById(SHEETS.AdjustmentRequests, request.id, {
          status: 'APPLIED',
          reviewedByUserId: request.submittedByUserId || '',
          reviewNotes: 'Applied immediately; approval is not required.',
          reviewedAt: existingTransaction.createdAt || new Date().toISOString(),
        })
        continue
      }

      const currentQuantity = Number(product?.physicalStock) || 0
      const change = Number(request.requestedChange)
      const resultingBalance = currentQuantity + change
      const invalid = !product || !Number.isFinite(change) || change === 0 || resultingBalance < 0

      if (invalid) {
        const now = new Date().toISOString()
        const reason = !product
          ? 'Not applied because the product no longer exists.'
          : 'Not applied because the change would result in invalid or negative stock.'
        await updateRowById(SHEETS.AdjustmentRequests, request.id, {
          status: 'REJECTED',
          reviewedByUserId: request.submittedByUserId || '',
          reviewNotes: reason,
          reviewedAt: now,
        })
        if (!auditRows.some((audit) => audit.entityId === request.id && audit.action === 'ADJUSTMENT_NOT_APPLIED')) {
          await appendAuditLog({
            actorId: request.submittedByUserId || '',
          actorName: userNames.get(request.submittedByUserId) ||
            auditRows.find((audit) => audit.entityId === request.id)?.actorName || 'Former staff',
            action: 'ADJUSTMENT_NOT_APPLIED',
            entityType: 'StockAdjustmentRequest',
            entityId: request.id,
            details: `${reason} Request: ${request.reason || 'No reason provided'}`,
          })
          auditRows.push({ entityId: request.id, action: 'ADJUSTMENT_NOT_APPLIED' })
        }
        continue
      }

      const now = new Date().toISOString()
      const transactionId = generateId()
      await appendRow(SHEETS.StockTransactions, [
        transactionId,
        product.id,
        'ADJUSTMENT',
        String(Math.abs(change)),
        String(currentQuantity),
        String(resultingBalance),
        String((Number(product.purchaseCost) || 0) / (Number(product.conversionRate) > 1 ? Number(product.conversionRate) : 1)),
        'USD',
        reference,
        `Count Correction: ${request.reason || 'Stock count correction'}`,
        request.notes || '',
        request.submittedByUserId || '',
        now,
      ])
      transactions.push({
        id: transactionId,
        productId: product.id,
        type: 'ADJUSTMENT',
        reference,
        previousBalance: String(currentQuantity),
        resultingBalance: String(resultingBalance),
        createdAt: now,
      })

      await updateRowById(SHEETS.Products, product.id, { physicalStock: String(resultingBalance) })
      product.physicalStock = String(resultingBalance)
      await updateRowById(SHEETS.AdjustmentRequests, request.id, {
        status: 'APPLIED',
        reviewedByUserId: request.submittedByUserId || '',
        reviewNotes: 'Applied immediately; approval is not required.',
        reviewedAt: now,
      })

      if (!auditRows.some((audit) => audit.entityId === request.id && audit.action === 'ADJUSTMENT_APPLIED')) {
        const actorName = userNames.get(request.submittedByUserId) ||
          auditRows.find((audit) => audit.entityId === request.id)?.actorName || 'Former staff'
        await appendAuditLog({
          actorId: request.submittedByUserId || '',
          actorName,
          action: 'ADJUSTMENT_APPLIED',
          entityType: 'StockAdjustmentRequest',
          entityId: request.id,
          details: `Applied legacy stock adjustment for ${product.name}: ${change > 0 ? '+' : ''}${change} (Balance: ${currentQuantity} -> ${resultingBalance}; Reason: ${request.reason || 'No reason provided'})`,
        })
        auditRows.push({ entityId: request.id, action: 'ADJUSTMENT_APPLIED' })
      }
    }
  })()

  try {
    await legacyAdjustmentResolution
  } finally {
    legacyAdjustmentResolution = null
  }
}

export async function getAdjustments(status?: string): Promise<AdjustmentRequest[]> {
  const initialRows = await getAllRows(SHEETS.AdjustmentRequests)
  if (initialRows.some((row) => row.status === 'PENDING')) {
    await resolveLegacyPendingAdjustments()
  }

  const [adjRows, prodRows, userRows, categoryRows, auditRows] = await Promise.all([
    getAllRows(SHEETS.AdjustmentRequests),
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Users),
    getAllRows(SHEETS.Categories),
    getAllRows(SHEETS.AuditLogs),
  ])
  const categoryMap = new Map(categoryRows.map((c) => [c.id, `${c.name || ''} ${c.nameKm || ''}`]))
  const prodMap = new Map(prodRows.map((p) => [p.id, normalizeUnitPair(p, categoryMap.get(p.categoryId) || '')]))
  const userMap = new Map(userRows.map((u) => [u.id, u.name]))
  const auditNameMap = new Map(auditRows.map((a) => [a.entityId, a.actorName]))

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
    status: (row.status === 'REJECTED' ? 'REJECTED' : 'APPLIED') as AdjustmentStatus,
    submittedByUserId: row.submittedByUserId || '',
    submittedByName: userMap.get(row.submittedByUserId) || auditNameMap.get(row.id) || 'Former staff',
    reviewedByUserId: row.reviewedByUserId || '',
    reviewedByName: userMap.get(row.reviewedByUserId) || auditNameMap.get(row.id) || '',
    reviewNotes: row.reviewNotes || '',
    createdAt: row.createdAt || '',
    reviewedAt: row.reviewedAt || '',
  }))

  if (status && status !== 'ALL') {
    list = list.filter((adjustment) => adjustment.status === status)
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
  if (params.requestedChange === 0) throw new Error('Requested change cannot be zero')
  if (!params.reason.trim()) throw new Error('Adjustment reason is required')

  const products = await getAllRows(SHEETS.Products)
  const product = products.find((p) => p.id === params.productId && p.active === 'true')
  if (!product) throw new Error('PRODUCT_NOT_FOUND')

  const currentQty = Number(product.physicalStock) || 0
  const resultingBalance = currentQty + params.requestedChange
  if (resultingBalance < 0) throw new Error('Adjustment cannot result in negative inventory')

  const id = generateId()
  const now = new Date().toISOString()
  await updateRowById(SHEETS.Products, product.id, { physicalStock: String(resultingBalance) })
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
    'APPLIED',
    params.userId,
    params.userId,
    'Applied immediately; approval is not required.',
    now,
    now,
  ])
  await appendAuditLog({
    actorId: params.userId,
    actorName: params.userName,
    action: 'ADJUSTMENT_APPLIED',
    entityType: 'StockAdjustmentRequest',
    entityId: id,
    details: `Applied adjustment of ${params.requestedChange > 0 ? '+' : ''}${params.requestedChange} for ${product.name} (${currentQty} -> ${resultingBalance}; Reason: ${params.reason}${params.notes ? `; Note: ${params.notes}` : ''})`,
  })

  return {
    id,
    productId: product.id,
    productName: product.name,
    currentQuantity: currentQty,
    requestedChange: params.requestedChange,
    reason: params.reason,
    notes: params.notes || '',
    status: 'APPLIED',
    submittedByUserId: params.userId,
    submittedByName: params.userName,
    reviewedByUserId: params.userId,
    reviewedByName: params.userName,
    reviewNotes: 'Applied immediately; approval is not required.',
    createdAt: now,
    reviewedAt: now,
  }
}
