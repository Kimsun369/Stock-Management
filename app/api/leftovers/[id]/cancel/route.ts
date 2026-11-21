import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { cancelCustomerLeftover } from '@/backend/services/leftovers.service'
import { leftoverCancelSchema } from '@/lib/validations'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { id } = await params
    const json = await req.json().catch(() => ({}))
    const parsed = leftoverCancelSchema.safeParse(json)
    const reason = parsed.success && parsed.data.reason ? parsed.data.reason : 'Admin cancelled leftover'

    await cancelCustomerLeftover({
      recordId: id,
      reason,
      userId: session.user.id,
      userName: session.user.name || 'Admin',
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
