import { getAllRows, appendRow, updateRowById, appendAuditLog, generateId, SHEETS } from '@/backend/sheets'
import { Product, ProductWithDetails } from '@/backend/types'
import { configuredPurchaseCost, normalizeUnitPair } from '@/backend/unit-config'

export async function getProducts(filters?: {
  search?: string
  categoryId?: string
  status?: 'all' | 'inStock' | 'lowStock' | 'outOfStock'
  page?: number
  limit?: number
}): Promise<{ products: ProductWithDetails[]; total: number; page: number; totalPages: number }> {
  const [productRows, categoryRows, supplierRows] = await Promise.all([
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Categories),
    getAllRows(SHEETS.Suppliers),
  ])

  const catMap = new Map(categoryRows.map((c) => [c.id, c]))
  const supMap = new Map(supplierRows.map((s) => [s.id, s.name]))

  let list: ProductWithDetails[] = productRows.map((p) => {
    const cat = catMap.get(p.categoryId)
    const units = normalizeUnitPair(p, `${cat?.name || ''} ${cat?.nameKm || ''}`)
    const physical = Number(p.physicalStock) || 0
    const reserved = Number(p.reservedStock) || 0
    const available = Math.max(0, physical - reserved)

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      nameKm: p.nameKm || '',
      categoryId: p.categoryId,
      brand: p.brand || '',
      unit: units.unit || 'units',
      altUnit: units.altUnit || '',
      conversionRate: Number(units.conversionRate) || 1,
      purchaseCost: configuredPurchaseCost(p, units),
      physicalStock: physical,
      reservedStock: reserved,
      availableStock: available,
      minStock: Number(p.minStock) || 5,
      defaultSupplierId: p.defaultSupplierId || '',
      description: p.description || '',
      descriptionKm: p.descriptionKm || '',
      active: p.active === 'true',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      categoryName: cat ? cat.name : '',
      categoryNameKm: cat ? cat.nameKm : '',
      supplierName: supMap.get(p.defaultSupplierId) || '',
    }
  })

  // Filter active products by default (or show all)
  list = list.filter((p) => p.active)

  // Filter category
  if (filters?.categoryId && filters.categoryId !== 'ALL') {
    list = list.filter((p) => p.categoryId === filters.categoryId)
  }

  // Filter stock status
  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'outOfStock') {
      list = list.filter((p) => p.availableStock <= 0)
    } else if (filters.status === 'lowStock') {
      list = list.filter((p) => p.availableStock > 0 && p.availableStock <= p.minStock)
    } else if (filters.status === 'inStock') {
      list = list.filter((p) => p.availableStock > p.minStock)
    }
  }

  // Filter search
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameKm && p.nameKm.toLowerCase().includes(q)) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
    )
  }

  // Sort by name
  list.sort((a, b) => a.name.localeCompare(b.name))

  const total = list.length
  const page = Math.max(1, filters?.page || 1)
  const limit = Math.max(1, filters?.limit || 20)
  const totalPages = Math.ceil(total / limit) || 1
  const paginated = list.slice((page - 1) * limit, page * limit)

  return { products: paginated, total, page, totalPages }
}

export async function getProductById(id: string): Promise<ProductWithDetails | null> {
  const [productRows, categoryRows, supplierRows] = await Promise.all([
    getAllRows(SHEETS.Products),
    getAllRows(SHEETS.Categories),
    getAllRows(SHEETS.Suppliers),
  ])

  const p = productRows.find((row) => row.id === id || row.sku === id)
  if (!p) return null
  const cat = categoryRows.find((c) => c.id === p.categoryId)
  const units = normalizeUnitPair(p, `${cat?.name || ''} ${cat?.nameKm || ''}`)
  const sup = supplierRows.find((s) => s.id === p.defaultSupplierId)

  const physical = Number(p.physicalStock) || 0
  const reserved = Number(p.reservedStock) || 0

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    nameKm: p.nameKm || '',
    categoryId: p.categoryId,
    brand: p.brand || '',
    unit: units.unit || 'units',
    altUnit: units.altUnit || '',
    conversionRate: Number(units.conversionRate) || 1,
    purchaseCost: configuredPurchaseCost(p, units),
    physicalStock: physical,
    reservedStock: reserved,
    availableStock: Math.max(0, physical - reserved),
    minStock: Number(p.minStock) || 5,
    defaultSupplierId: p.defaultSupplierId || '',
    description: p.description || '',
    descriptionKm: p.descriptionKm || '',
    active: p.active === 'true',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    categoryName: cat?.name || '',
    categoryNameKm: cat?.nameKm || '',
    supplierName: sup?.name || '',
  }
}

export async function createProduct(
  data: {
    sku: string
    name: string
    nameKm?: string
    categoryId: string
    brand?: string
    unit?: string
    altUnit?: string
    conversionRate?: number
    purchaseCost?: number
    minStock?: number
    defaultSupplierId?: string
    description?: string
    descriptionKm?: string
  },
  userId: string,
  userName: string
): Promise<Product> {
  const sku = data.sku?.trim().toUpperCase() || ''
  if (!data.name.trim()) throw new Error('Product name is required')
  if (!data.categoryId) throw new Error('Category is required')

  const existing = await getAllRows(SHEETS.Products)
  if (sku && existing.some((p) => p.sku?.toUpperCase() === sku)) {
    throw new Error('DUPLICATE_SKU')
  }

  // If purchaseCost is not provided, use Category's agreedPurchasePrice
  let resolvedCost = Number(data.purchaseCost) || 0
  if (!resolvedCost) {
    const categories = await getAllRows(SHEETS.Categories)
    const cat = categories.find((c) => c.id === data.categoryId)
    if (cat && cat.agreedPurchasePrice) {
      resolvedCost = Number(cat.agreedPurchasePrice) || 0
    }
  }

  const id = generateId()
  const now = new Date().toISOString()
  const unit = data.unit || 'can'
  const altUnit = data.altUnit?.trim() || ''
  const conversionRate = String(Number(data.conversionRate) || 1)
  const purchaseCost = String(resolvedCost)
  const minStock = String(Number(data.minStock) || 5)

  await appendRow(SHEETS.Products, [
    id,
    sku,
    data.name.trim(),
    data.nameKm?.trim() || '',
    data.categoryId,
    data.brand?.trim() || '',
    unit,
    purchaseCost,
    '0', // physicalStock starts at 0
    '0', // reservedStock starts at 0
    minStock,
    data.defaultSupplierId || '',
    data.description || '',
    data.descriptionKm || '',
    'true',
    now,
    now,
    altUnit,
    conversionRate,
  ])

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: id,
    details: `Created product "${data.name}"`,
  })

  return {
    id,
    sku,
    name: data.name.trim(),
    nameKm: data.nameKm?.trim() || '',
    categoryId: data.categoryId,
    brand: data.brand?.trim() || '',
    unit,
    altUnit,
    conversionRate: Number(conversionRate),
    purchaseCost: Number(purchaseCost),
    physicalStock: 0,
    reservedStock: 0,
    minStock: Number(minStock),
    defaultSupplierId: data.defaultSupplierId || '',
    description: data.description || '',
    descriptionKm: data.descriptionKm || '',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateProduct(
  id: string,
  data: Partial<Product>,
  userId: string,
  userName: string
): Promise<Product> {
  const existing = await getAllRows(SHEETS.Products)
  const product = existing.find((p) => p.id === id)
  if (!product) throw new Error('PRODUCT_NOT_FOUND')

  if (data.sku && data.sku.toUpperCase() !== product.sku.toUpperCase()) {
    const skuConflict = existing.some(
      (p) => p.id !== id && (p.sku || '').toUpperCase() === data.sku!.toUpperCase()
    )
    if (skuConflict) throw new Error('DUPLICATE_SKU')
  }

  const updates: Record<string, string> = {}
  if (data.sku) updates.sku = data.sku.trim().toUpperCase()
  if (data.name) updates.name = data.name.trim()
  if (data.nameKm !== undefined) updates.nameKm = data.nameKm.trim()
  if (data.categoryId) updates.categoryId = data.categoryId
  if (data.brand !== undefined) updates.brand = data.brand.trim()
  if (data.unit) updates.unit = data.unit
  if (data.altUnit !== undefined) updates.altUnit = data.altUnit.trim()
  if (data.conversionRate !== undefined) updates.conversionRate = String(Number(data.conversionRate) || 1)
  if (data.purchaseCost !== undefined) updates.purchaseCost = String(Number(data.purchaseCost))
  if (data.minStock !== undefined) updates.minStock = String(Number(data.minStock))
  if (data.defaultSupplierId !== undefined) updates.defaultSupplierId = data.defaultSupplierId
  if (data.description !== undefined) updates.description = data.description
  if (data.descriptionKm !== undefined) updates.descriptionKm = data.descriptionKm
  if (data.active !== undefined) updates.active = String(data.active)

  await updateRowById(SHEETS.Products, id, updates)

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'PRODUCT_UPDATED',
    entityType: 'Product',
    entityId: id,
    details: `Updated product "${data.name || product.name}"`,
  })

  const updated = await getProductById(id)
  return updated!
}

export async function deactivateProduct(id: string, userId: string, userName: string): Promise<void> {
  const product = await getProductById(id)
  if (!product) throw new Error('PRODUCT_NOT_FOUND')

  await updateRowById(SHEETS.Products, id, { active: 'false' })

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'PRODUCT_DEACTIVATED',
    entityType: 'Product',
    entityId: id,
    details: `Deactivated product "${product.name}"`,
  })
}

