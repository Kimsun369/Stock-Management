import React from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/backend/auth'
import { AuditLogsView } from '@/frontend/components/audit-logs/AuditLogsView'

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  return <AuditLogsView />
}

