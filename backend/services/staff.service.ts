import { getAllRows, appendRow, updateRowById, deleteRowById, appendAuditLog, generateId, SHEETS } from '@/backend/sheets'
import { User, Role } from '@/backend/types'
import bcrypt from 'bcryptjs'

const SUPER_ADMIN_EMAIL = 'povmesa97@gmail.com'

export type StaffUserSummary = Omit<User, 'password'> & { hasPassword: boolean }

export async function getStaffUsers(): Promise<StaffUserSummary[]> {
  const rows = await getAllRows(SHEETS.Users)
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    hasPassword: Boolean(u.password),
    role: u.role as Role,
    preferredLanguage: u.preferredLanguage || 'km',
    numeralSystem: u.numeralSystem || 'western',
    active: u.active === 'true',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }))
}

export async function createStaffUser(
  data: {
    name: string
    email: string
    password?: string
    role?: Role
  },
  adminUserId: string,
  adminUserName: string
): Promise<Omit<User, 'password'>> {
  if (!data.name.trim()) throw new Error('Name is required')
  if (!data.email.trim()) throw new Error('Email is required')

  const email = data.email.toLowerCase().trim()
  const users = await getAllRows(SHEETS.Users)
  if (users.some((u) => u.email.toLowerCase().trim() === email)) {
    throw new Error('DUPLICATE_EMAIL')
  }

  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : ''
  const id = generateId()
  const now = new Date().toISOString()
  const role: Role = data.role === 'ADMIN' ? 'ADMIN' : 'STAFF'

  await appendRow(SHEETS.Users, [
    id,
    data.name.trim(),
    email,
    hashedPassword,
    role,
    'km', // default preferredLanguage
    'western', // default numeralSystem
    'true',
    now,
    now,
  ])

  await appendAuditLog({
    actorId: adminUserId,
    actorName: adminUserName,
    action: 'STAFF_CREATED',
    entityType: 'User',
    entityId: id,
    details: `Created user "${data.name}" (${email}) with role ${role}`,
  })

  return {
    id,
    name: data.name.trim(),
    email,
    role,
    preferredLanguage: 'km',
    numeralSystem: 'western',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateStaffUser(
  id: string,
  data: {
    name?: string
    email?: string
    role?: Role
    active?: boolean
    password?: string
  },
  adminUserId: string,
  adminUserName: string
): Promise<void> {
  const users = await getAllRows(SHEETS.Users)
  const user = users.find((u) => u.id === id)
  if (!user) throw new Error('USER_NOT_FOUND')
  if (user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL && (
    (data.email !== undefined && data.email.toLowerCase().trim() !== SUPER_ADMIN_EMAIL) ||
    data.role === 'STAFF' || data.active === false
  )) throw new Error('CANNOT_CHANGE_MAIN_ADMIN')
  const removesLastActiveAdmin = user.role === 'ADMIN' && user.active === 'true' &&
    (data.active === false || data.role === 'STAFF') &&
    users.filter((item) => item.role === 'ADMIN' && item.active === 'true').length <= 1
  if (removesLastActiveAdmin) throw new Error('CANNOT_REMOVE_LAST_ADMIN')

  const updates: Record<string, string> = {}
  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error('Name is required')
    updates.name = data.name.trim()
  }
  if (data.email !== undefined) {
    if (!data.email.trim()) throw new Error('Email is required')
    const email = data.email.trim().toLowerCase()
    if (users.some((item) => item.id !== id && item.email.toLowerCase().trim() === email)) {
      throw new Error('DUPLICATE_EMAIL')
    }
    updates.email = email
  }
  if (data.role !== undefined) {
    if (data.role !== 'ADMIN' && data.role !== 'STAFF') throw new Error('INVALID_ROLE')
    updates.role = data.role
  }
  if (data.active !== undefined) updates.active = String(data.active)
  if (data.password) {
    updates.password = await bcrypt.hash(data.password, 10)
  }

  await updateRowById(SHEETS.Users, id, updates)

  const { password, ...safeData } = data
  await appendAuditLog({
    actorId: adminUserId,
    actorName: adminUserName,
    action: 'STAFF_UPDATED',
    entityType: 'User',
    entityId: id,
    details: `Updated user "${user.name}" (${user.email}). Changes: ${JSON.stringify({ ...safeData, passwordUpdated: Boolean(password) })}`,
  })
}

export async function deleteStaffUser(
  id: string,
  adminUserId: string,
  adminUserName: string
): Promise<void> {
  const users = await getAllRows(SHEETS.Users)
  const user = users.find((u) => u.id === id)
  if (!user) throw new Error('USER_NOT_FOUND')

  // The Google-verified owner account is the permanent system administrator.
  if (user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL) throw new Error('CANNOT_DELETE_MAIN_ADMIN')

  // Cannot delete yourself
  if (id === adminUserId) throw new Error('CANNOT_DELETE_SELF')

  if (user.role === 'ADMIN' && user.active === 'true' && users.filter((item) => item.role === 'ADMIN' && item.active === 'true').length <= 1) {
    throw new Error('CANNOT_DELETE_LAST_ADMIN')
  }

  await deleteRowById(SHEETS.Users, id)

  await appendAuditLog({
    actorId: adminUserId,
    actorName: adminUserName,
    action: 'STAFF_DELETED',
    entityType: 'User',
    entityId: id,
    details: `Deleted user "${user.name}" (${user.email})`,
  })
}

