import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getAllRows, appendRow, initializeSheets, SHEETS, generateId } from '@/backend/sheets'

export async function POST(req: Request) {
  try {
    const setupSecret = process.env.SETUP_SECRET
    const authHeader = req.headers.get('x-setup-secret')

    // Always require SETUP_SECRET to be configured and provided
    if (!setupSecret || !authHeader) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Constant-time comparison
    const secretBuf = Buffer.from(setupSecret)
    const headerBuf = Buffer.from(authHeader)
    if (secretBuf.length !== headerBuf.length || !crypto.timingSafeEqual(secretBuf, headerBuf)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await initializeSheets()
    const users = await getAllRows(SHEETS.Users)

    // Once any active admin exists, permanently deny access
    const hasAdmin = users.some((u) => u.role === 'ADMIN' && u.active === 'true')
    if (hasAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim()
    const password = process.env.INITIAL_ADMIN_PASSWORD
    const name = process.env.INITIAL_ADMIN_NAME || 'System Administrator'

    if (!email || !password) {
      return NextResponse.json(
        { error: 'INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables must be configured' },
        { status: 500 }
      )
    }

    // Check if user with that email already exists
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = generateId()
    const now = new Date().toISOString()

    await appendRow(SHEETS.Users, [
      id,
      name,
      email,
      hashedPassword,
      'ADMIN',
      'km',
      'western',
      'true',
      now,
      now,
    ])

    return NextResponse.json({
      success: true,
      message: 'Initial Admin account created successfully',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 })
  }
}
