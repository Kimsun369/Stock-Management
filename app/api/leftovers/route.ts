import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getCustomerRecords, registerCustomerLeftover } from '@/backend/services/leftovers.service'
import { leftoverRegisterSchema } from '@/lib/validations'
import { checkIdempotency, resolveIdempotency, clearIdempotency } from '@/lib/idempotency'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20

    const result = await getCustomerRecords({ search, status, page, limit })
    return NextResponse.json(result)
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
    const parsed = leftoverRegisterSchema.safeParse(json)
    if (!parsed.success) {
      clearIdempotency(idempotencyKey)
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }

    try {
      const result = await registerCustomerLeftover({
        ...parsed.data,
        userId: session.user.id,
        userName: session.user.name || 'Staff',
      })
      resolveIdempotency(idempotencyKey, result)
      return NextResponse.json(result)
    } catch (err: any) {
      clearIdempotency(idempotencyKey)
      const isClientError = err.message.includes('INSUFFICIENT_STOCK') || err.message.includes('required')
      return NextResponse.json({ error: err.message }, { status: isClientError ? 400 : 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
