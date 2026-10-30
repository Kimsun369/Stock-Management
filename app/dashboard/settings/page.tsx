import React from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/backend/auth'
import { SettingsView } from '@/frontend/components/settings/SettingsView'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  return <SettingsView />
}

