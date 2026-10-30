import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getProducts, createProduct } from '@/backend/services/products.service'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const status = (searchParams.get('status') as any) || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20

    const result = await getProducts({ search, categoryId, status, page, limit })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error fetching products' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const body = await req.json()
    const product = await createProduct(body, session.user.id, session.user.name || 'Admin')
    return NextResponse.json(product)
  } catch (error: any) {
    const status = error.message === 'DUPLICATE_SKU' ? 400 : 500
    return NextResponse.json({ error: error.message || 'Error creating product' }, { status })
  }
}

