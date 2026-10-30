import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { updateCategory, deleteCategory } from '@/backend/services/categories.service'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const cat = await updateCategory(id, body, session.user.id, session.user.name || 'Admin')
    return NextResponse.json(cat)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { id } = await params
    await deleteCategory(id, session.user.id, session.user.name || 'Admin')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.message === 'CATEGORY_HAS_PRODUCTS' ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

