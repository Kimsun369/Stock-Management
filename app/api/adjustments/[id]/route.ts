import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { reviewAdjustment } from '@/backend/services/adjustments.service'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { id } = await params
    const body = await req.json()

    const adj = await reviewAdjustment({
      id,
      action: body.action,
      reviewNotes: body.reviewNotes,
      userId: session.user.id,
      userName: session.user.name || 'Admin',
    })

    return NextResponse.json(adj)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

