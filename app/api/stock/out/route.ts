import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { recordStockOut, getStockLedger } from '@/backend/services/inventory.service'
import { stockOutSchema } from '@/lib/validations'
import { checkIdempotency, resolveIdempotency, clearIdempotency } from '@/lib/idempotency'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId') || undefined
    const limit = Number(searchParams.get('limit')) || 50
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

    const list = await getStockLedger({ productId, type: 'STOCK_OUT', limit, offset })
    return NextResponse.json(list)
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
    const parsed = stockOutSchema.safeParse(json)
    if (!parsed.success) {
      clearIdempotency(idempotencyKey)
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }

    try {
      const result = await recordStockOut({
        ...parsed.data,
        userId: session.user.id,
        userName: session.user.name || 'Staff',
      })
      resolveIdempotency(idempotencyKey, result)
      return NextResponse.json(result)
    } catch (err: any) {
      clearIdempotency(idempotencyKey)
      const status = err.message === 'INSUFFICIENT_STOCK' ? 400 : 500
      return NextResponse.json({ error: err.message }, { status })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
