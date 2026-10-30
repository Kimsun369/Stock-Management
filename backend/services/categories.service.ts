import { getAllRows, appendRow, updateRowById, appendAuditLog, generateId, SHEETS } from '@/backend/sheets'
import { Category } from '@/backend/types'

export async function getCategories(): Promise<Category[]> {
  const [catRows, productRows] = await Promise.all([
    getAllRows(SHEETS.Categories),
    getAllRows(SHEETS.Products),
  ])

  // Count active products per category
  const productCountMap = new Map<string, number>()
  for (const p of productRows) {
    if (p.active === 'true') {
      const cId = p.categoryId
      productCountMap.set(cId, (productCountMap.get(cId) || 0) + 1)
    }
  }

  return catRows
    .filter((c) => c.active === 'true')
    .map((c) => ({
      id: c.id,
      name: c.name,
      nameKm: c.nameKm || '',
      description: c.description || '',
      agreedPurchasePrice: Number(c.agreedPurchasePrice) || 0,
      active: true,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      productCount: productCountMap.get(c.id) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createCategory(
  data: { name: string; nameKm?: string; description?: string; agreedPurchasePrice?: number },
  userId: string,
  userName: string
): Promise<Category> {
  if (!data.name.trim()) throw new Error('Category name is required')

  const existing = await getAllRows(SHEETS.Categories)
  if (existing.some((c) => c.name.toLowerCase() === data.name.trim().toLowerCase())) {
    throw new Error('DUPLICATE_CATEGORY')
  }

  const id = generateId()
  const now = new Date().toISOString()
  const agreedPrice = data.agreedPurchasePrice !== undefined ? String(Number(data.agreedPurchasePrice) || 0) : '0'

  await appendRow(SHEETS.Categories, [
    id,
    data.name.trim(),
    data.nameKm?.trim() || '',
    data.description?.trim() || '',
    'true',
    now,
    now,
    agreedPrice,
  ])

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'CATEGORY_CREATED',
    entityType: 'Category',
    entityId: id,
    details: `Created category "${data.name}" with agreed price $${agreedPrice}`,
  })

  return {
    id,
    name: data.name.trim(),
    nameKm: data.nameKm?.trim() || '',
    description: data.description?.trim() || '',
    agreedPurchasePrice: Number(agreedPrice),
    active: true,
    createdAt: now,
    updatedAt: now,
    productCount: 0,
  }
}

export async function updateCategory(
  id: string,
  data: { name?: string; nameKm?: string; description?: string; agreedPurchasePrice?: number; applyToProducts?: boolean },
  userId: string,
  userName: string
): Promise<Category> {
  const existing = await getAllRows(SHEETS.Categories)
  const cat = existing.find((c) => c.id === id)
  if (!cat) throw new Error('CATEGORY_NOT_FOUND')

  const updates: Record<string, string> = {}
  if (data.name) updates.name = data.name.trim()
  if (data.nameKm !== undefined) updates.nameKm = data.nameKm.trim()
  if (data.description !== undefined) updates.description = data.description.trim()
  if (data.agreedPurchasePrice !== undefined) {
    const priceStr = String(Number(data.agreedPurchasePrice) || 0)
    updates.agreedPurchasePrice = priceStr

    // If applyToProducts is true (or by default when agreed price changes), update products in category
    if (data.applyToProducts !== false) {
      const productRows = await getAllRows(SHEETS.Products)
      for (const p of productRows) {
        if (p.categoryId === id && p.active === 'true') {
          await updateRowById(SHEETS.Products, p.id, { purchaseCost: priceStr })
        }
      }
    }
  }

  await updateRowById(SHEETS.Categories, id, updates)

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'CATEGORY_UPDATED',
    entityType: 'Category',
    entityId: id,
    details: `Updated category "${data.name || cat.name}"`,
  })

  return {
    id,
    name: data.name?.trim() || cat.name,
    nameKm: data.nameKm !== undefined ? data.nameKm.trim() : cat.nameKm,
    description: data.description !== undefined ? data.description.trim() : cat.description,
    agreedPurchasePrice: data.agreedPurchasePrice !== undefined ? Number(data.agreedPurchasePrice) : Number(cat.agreedPurchasePrice || 0),
    active: true,
    createdAt: cat.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteCategory(id: string, userId: string, userName: string): Promise<void> {
  const products = await getAllRows(SHEETS.Products)
  const hasProducts = products.some((p) => p.categoryId === id && p.active === 'true')
  if (hasProducts) {
    throw new Error('CATEGORY_HAS_PRODUCTS')
  }

  await updateRowById(SHEETS.Categories, id, { active: 'false' })

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'CATEGORY_DELETED',
    entityType: 'Category',
    entityId: id,
    details: `Deactivated category ${id}`,
  })
}

