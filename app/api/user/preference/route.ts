import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { updateRowById, SHEETS } from '@/backend/sheets'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const updates: Record<string, string> = {}
    if (body.preferredLanguage) updates.preferredLanguage = body.preferredLanguage
    if (body.numeralSystem) updates.numeralSystem = body.numeralSystem

    await updateRowById(SHEETS.Users, session.user.id, updates)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

