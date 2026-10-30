import React from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/backend/auth'
import { StaffView } from '@/frontend/components/staff/StaffView'

export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  return <StaffView />
}

