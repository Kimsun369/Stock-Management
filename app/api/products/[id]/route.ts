import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getProductById, updateProduct, deactivateProduct } from '@/backend/services/products.service'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { id } = await params
    const product = await getProductById(id)
    if (!product) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json(product)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const product = await updateProduct(id, body, session.user.id, session.user.name || 'Admin')
    return NextResponse.json(product)
  } catch (error: any) {
    const status = error.message === 'DUPLICATE_SKU' ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { id } = await params
    await deactivateProduct(id, session.user.id, session.user.name || 'Admin')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

