'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { I18nProvider } from '@/lib/i18n-context'
import { ThemeProvider } from '@/lib/theme-context'

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
          {children}
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
