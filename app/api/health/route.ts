import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getSheetsClient } from '@/backend/sheets'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    // Protected by HEALTH_TOKEN header OR an active ADMIN session
    const healthTokenHeader = req.headers.get('x-health-token')
    const configuredHealthToken = process.env.HEALTH_TOKEN

    let isAuthorized = false

    if (configuredHealthToken && healthTokenHeader === configuredHealthToken) {
      isAuthorized = true
    } else {
      const session = await getServerSession(authOptions)
      if (session?.user?.role === 'ADMIN') {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Perform a cheap, non-destructive read to verify Google Sheets API connectivity
    const sheets = await getSheetsClient()
    const sheetId = process.env.GOOGLE_SHEET_ID

    if (!sheetId) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'GOOGLE_SHEET_ID not configured' },
        { status: 503 }
      )
    }

    // Query cell A1 of Settings sheet (minimal quota impact)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Settings!A1:B1',
    })

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sheetsConnected: true,
      rangeChecked: res.data.range || 'Settings!A1:B1',
      uptimeSeconds: Math.floor(process.uptime()),
    })
  } catch (err: any) {
    logger.error('Health check failed:', err.message)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        sheetsConnected: false,
        error: err.message || 'Sheets connection failed',
      },
      { status: 503 }
    )
  }
}
