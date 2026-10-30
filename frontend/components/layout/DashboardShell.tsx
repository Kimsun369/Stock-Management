'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-[#08080B] dashboard-atmosphere text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Sidebar
        userRole={session?.user?.role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-72 flex flex-col min-h-screen w-full min-w-0 overflow-x-hidden">
        <Topbar onOpenMobileMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
