import { NextResponse } from 'next/server'
import { getAllRows, appendRow, initializeSheets, SHEETS, generateId } from '@/backend/sheets'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    await initializeSheets()

    const users = await getAllRows(SHEETS.Users)
    const setupSecret = process.env.SETUP_SECRET
    const authHeader = req.headers.get('x-setup-secret')

    // If users already exist and no matching setup secret, forbid
    if (users.length > 0 && (!setupSecret || authHeader !== setupSecret)) {
      return NextResponse.json(
        { error: 'Admin already initialized. Provide valid x-setup-secret to create another.' },
        { status: 403 }
      )
    }

    const email = process.env.INITIAL_ADMIN_EMAIL || 'povmesa97@gmail.com'
    const password = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPassword123!'
    const name = process.env.INITIAL_ADMIN_NAME || 'Mesa Pov'

    // Check if admin already exists
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ message: 'Admin account already exists', email })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = generateId()
    const now = new Date().toISOString()

    await appendRow(SHEETS.Users, [
      id,
      name,
      email.toLowerCase().trim(),
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
      email,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 })
  }
}
