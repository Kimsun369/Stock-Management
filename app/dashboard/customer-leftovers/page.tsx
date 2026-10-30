import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { LeftoversView } from '@/frontend/components/leftovers/LeftoversView'

export default async function CustomerLeftoversPage() {
  const session = await getServerSession(authOptions)
  return <LeftoversView userRole={session?.user?.role} />
}

