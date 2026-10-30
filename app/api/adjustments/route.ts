import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getAdjustments, requestAdjustment } from '@/backend/services/adjustments.service'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const list = await getAdjustments(status)
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
    const adj = await requestAdjustment({
      ...body,
      userId: session.user.id,
      userName: session.user.name || 'Staff',
    })

    return NextResponse.json(adj)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

