import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { AdjustmentsView } from '@/frontend/components/adjustments/AdjustmentsView'

export default async function AdjustmentsPage() {
  const session = await getServerSession(authOptions)
  return <AdjustmentsView userRole={session?.user?.role} />
}

