import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getAdjustments, requestAdjustment } from '@/backend/services/adjustments.service'
import { adjustmentSchema } from '@/lib/validations'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const list = await getAdjustments(status)
    // Staff can review their own corrections. Admins retain the full audit history.
    const visibleList = session.user.role === 'ADMIN'
      ? list
      : list.filter((adjustment) => adjustment.submittedByUserId === session.user.id)
    return NextResponse.json(visibleList)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const json = await req.json()
    const parsed = adjustmentSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }

    const adj = await requestAdjustment({
      ...parsed.data,
      userId: session.user.id,
      userName: session.user.name || 'Staff',
    })

    return NextResponse.json(adj)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
