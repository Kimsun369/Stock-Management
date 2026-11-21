import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getAdjustments, requestAdjustment } from '@/backend/services/adjustments.service'
import { adjustmentSchema } from '@/lib/validations'
import { checkIdempotency, resolveIdempotency, clearIdempotency } from '@/lib/idempotency'

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

    const idempotencyKey = req.headers.get('x-idempotency-key')
    const { isDuplicate, cachedResponse } = checkIdempotency(idempotencyKey)
    if (isDuplicate) {
      if (cachedResponse) return NextResponse.json(cachedResponse)
      return NextResponse.json({ error: 'Duplicate request in progress. Please wait.' }, { status: 409 })
    }

    const json = await req.json()
    const parsed = adjustmentSchema.safeParse(json)
    if (!parsed.success) {
      clearIdempotency(idempotencyKey)
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }

    try {
      const adj = await requestAdjustment({
        ...parsed.data,
        userId: session.user.id,
        userName: session.user.name || 'Staff',
      })
      resolveIdempotency(idempotencyKey, adj)
      return NextResponse.json(adj)
    } catch (err: any) {
      clearIdempotency(idempotencyKey)
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
