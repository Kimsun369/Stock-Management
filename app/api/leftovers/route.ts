import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getCustomerRecords, registerCustomerLeftover } from '@/backend/services/leftovers.service'

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

    const body = await req.json()
    const result = await registerCustomerLeftover({
      ...body,
      userId: session.user.id,
      userName: session.user.name || 'Staff',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    const isClientError = error.message.includes('INSUFFICIENT_STOCK') || error.message.includes('required')
    return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 })
  }
}

