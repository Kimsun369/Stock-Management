import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getSuppliers, createSupplier } from '@/backend/services/suppliers.service'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const suppliers = await getSuppliers()
    return NextResponse.json(suppliers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const body = await req.json()
    const supplier = await createSupplier(body, session.user.id, session.user.name || 'Admin')
    return NextResponse.json(supplier)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

