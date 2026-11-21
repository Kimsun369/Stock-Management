import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getAllRows, deleteRowById, SHEETS } from '@/backend/sheets'

/**
 * POST /api/admin/cleanup-inactive
 * Physically deletes all inactive (active=false) product rows from the Google Sheet.
 * Admin only. One-time cleanup.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const rows = await getAllRows(SHEETS.Products)
    const inactiveRows = rows.filter((r) => r.active === 'false')

    const deleted: string[] = []
    const errors: string[] = []

    // Delete one at a time (order matters for row index shifting)
    for (const row of inactiveRows) {
      try {
        await deleteRowById(SHEETS.Products, row.id)
        deleted.push(row.name || row.id)
      } catch (err: any) {
        errors.push(`${row.id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      deletedCount: deleted.length,
      errors,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
