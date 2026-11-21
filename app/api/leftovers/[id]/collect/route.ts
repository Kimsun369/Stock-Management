import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { recordCustomerCollection } from '@/backend/services/leftovers.service'
import { leftoverCollectSchema } from '@/lib/validations'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { id } = await params
    const json = await req.json()
    const parsed = leftoverCollectSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }

    const result = await recordCustomerCollection({
      recordId: id,
      collections: parsed.data.collections,
      notes: parsed.data.notes,
      userId: session.user.id,
      userName: session.user.name || 'Staff',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    const isClientError = error.message.includes('QUANTITY_EXCEEDS') || error.message.includes('Cannot collect')
    return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 })
  }
}
