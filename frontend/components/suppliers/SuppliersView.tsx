'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SuppliersView() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/products')
  }, [router])

  return (
    <div className="p-8 text-center text-slate-500">
      Redirecting to Products...
    </div>
  )
}

export default SuppliersView

