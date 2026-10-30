import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/auth'
import { ProductsView } from '@/frontend/components/products/ProductsView'

export default async function ProductsPage() {
  const session = await getServerSession(authOptions)
  return <ProductsView userRole={session?.user?.role} />
}

