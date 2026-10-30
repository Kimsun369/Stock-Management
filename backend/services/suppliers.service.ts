import { getAllRows, appendRow, updateRowById, appendAuditLog, generateId, SHEETS } from '@/backend/sheets'
import { Supplier } from '@/backend/types'

export async function getSuppliers(): Promise<Supplier[]> {
  const [supRows, purchaseRows] = await Promise.all([
    getAllRows(SHEETS.Suppliers),
    getAllRows(SHEETS.PurchaseRecords),
  ])

  // Calculate total purchases per supplier
  const purchaseMap = new Map<string, number>()
  for (const pur of purchaseRows) {
    const sId = pur.supplierId
    const amount = Number(pur.totalAmount) || 0
    purchaseMap.set(sId, (purchaseMap.get(sId) || 0) + amount)
  }

  return supRows
    .filter((s) => s.active === 'true')
    .map((s) => ({
      id: s.id,
      name: s.name,
      nameKm: s.nameKm || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
      active: true,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      totalPurchases: purchaseMap.get(s.id) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createSupplier(
  data: {
    name: string
    nameKm?: string
    contactPerson?: string
    phone?: string
    email?: string
    address?: string
    notes?: string
  },
  userId: string,
  userName: string
): Promise<Supplier> {
  if (!data.name.trim()) throw new Error('Supplier name is required')

  const id = generateId()
  const now = new Date().toISOString()

  await appendRow(SHEETS.Suppliers, [
    id,
    data.name.trim(),
    data.nameKm?.trim() || '',
    data.contactPerson?.trim() || '',
    data.phone?.trim() || '',
    data.email?.trim() || '',
    data.address?.trim() || '',
    data.notes?.trim() || '',
    'true',
    now,
    now,
  ])

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'SUPPLIER_CREATED',
    entityType: 'Supplier',
    entityId: id,
    details: `Created supplier "${data.name}"`,
  })

  return {
    id,
    name: data.name.trim(),
    nameKm: data.nameKm?.trim() || '',
    contactPerson: data.contactPerson?.trim() || '',
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    address: data.address?.trim() || '',
    notes: data.notes?.trim() || '',
    active: true,
    createdAt: now,
    updatedAt: now,
    totalPurchases: 0,
  }
}

export async function updateSupplier(
  id: string,
  data: Partial<Supplier>,
  userId: string,
  userName: string
): Promise<Supplier> {
  const existing = await getAllRows(SHEETS.Suppliers)
  const sup = existing.find((s) => s.id === id)
  if (!sup) throw new Error('SUPPLIER_NOT_FOUND')

  const updates: Record<string, string> = {}
  if (data.name) updates.name = data.name.trim()
  if (data.nameKm !== undefined) updates.nameKm = data.nameKm.trim()
  if (data.contactPerson !== undefined) updates.contactPerson = data.contactPerson.trim()
  if (data.phone !== undefined) updates.phone = data.phone.trim()
  if (data.email !== undefined) updates.email = data.email.trim()
  if (data.address !== undefined) updates.address = data.address.trim()
  if (data.notes !== undefined) updates.notes = data.notes.trim()

  await updateRowById(SHEETS.Suppliers, id, updates)

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'SUPPLIER_UPDATED',
    entityType: 'Supplier',
    entityId: id,
    details: `Updated supplier "${data.name || sup.name}"`,
  })

  return {
    id,
    name: data.name?.trim() || sup.name,
    nameKm: data.nameKm !== undefined ? data.nameKm.trim() : sup.nameKm,
    contactPerson: data.contactPerson !== undefined ? data.contactPerson.trim() : sup.contactPerson,
    phone: data.phone !== undefined ? data.phone.trim() : sup.phone,
    email: data.email !== undefined ? data.email.trim() : sup.email,
    address: data.address !== undefined ? data.address.trim() : sup.address,
    notes: data.notes !== undefined ? data.notes.trim() : sup.notes,
    active: true,
    createdAt: sup.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteSupplier(id: string, userId: string, userName: string): Promise<void> {
  const purchases = await getAllRows(SHEETS.PurchaseRecords)
  const hasPurchases = purchases.some((p) => p.supplierId === id)
  if (hasPurchases) {
    throw new Error('SUPPLIER_HAS_TRANSACTIONS')
  }

  await updateRowById(SHEETS.Suppliers, id, { active: 'false' })

  await appendAuditLog({
    actorId: userId,
    actorName: userName,
    action: 'SUPPLIER_DELETED',
    entityType: 'Supplier',
    entityId: id,
    details: `Deactivated supplier ${id}`,
  })
}

