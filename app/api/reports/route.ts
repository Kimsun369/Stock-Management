import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getReportData, generateCsvReport } from '@/backend/services/reports.service'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') || 'stock') as any
    const format = searchParams.get('format') || 'json'
    const language = (searchParams.get('lang') || 'km') as 'km' | 'en'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined

    if (format === 'csv') {
      const csv = await generateCsvReport({
        type,
        language,
        startDate,
        endDate,
        categoryId,
        supplierId,
      })

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${type}_report_${Date.now()}.csv"`,
        },
      })
    }

    const data = await getReportData({ type, startDate, endDate, categoryId, supplierId })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

