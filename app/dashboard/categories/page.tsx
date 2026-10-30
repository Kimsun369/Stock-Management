import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { CategoriesView } from '@/frontend/components/categories/CategoriesView'

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions)
  return <CategoriesView userRole={session?.user?.role} />
}

