import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { getDashboardMetrics, DashboardPeriod } from '@/backend/services/dashboard.service'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const periodParam = searchParams.get('period') as DashboardPeriod | null
    const period: DashboardPeriod = periodParam === 'today' || periodParam === 'thisWeek' || periodParam === 'thisMonth'
      ? periodParam
      : 'thisMonth'

    const metrics = await getDashboardMetrics(period)
    return NextResponse.json(metrics)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Dashboard fetch failed' }, { status: 500 })
  }
}
