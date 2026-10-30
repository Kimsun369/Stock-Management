import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { recordCustomerCollection } from '@/backend/services/leftovers.service'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const result = await recordCustomerCollection({
      recordId: id,
      collections: body.collections || [],
      notes: body.notes,
      userId: session.user.id,
      userName: session.user.name || 'Staff',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    const isClientError = error.message.includes('QUANTITY_EXCEEDS') || error.message.includes('Cannot collect')
    return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 })
  }
}

