import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { recordStockOut, getStockLedger } from '@/backend/services/inventory.service'

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

    const body = await req.json()
    const result = await recordStockOut({
      ...body,
      userId: session.user.id,
      userName: session.user.name || 'Staff',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    const status = error.message === 'INSUFFICIENT_STOCK' ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

