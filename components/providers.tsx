'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import { I18nProvider } from '@/lib/i18n-context'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/components/ui/toast'

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session?: any
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider>
          <ToastProvider>
            <SWRConfig
              value={{
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
                dedupingInterval: 5000,
              }}
            >
              {children}
            </SWRConfig>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
