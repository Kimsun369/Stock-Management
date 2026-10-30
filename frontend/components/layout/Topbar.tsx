'use client'

import React from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Menu, LogOut, User } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useI18n } from '@/lib/i18n-context'

interface TopbarProps {
  onOpenMobileMenu: () => void
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { data: session } = useSession()
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-18 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0D0D11]/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Left side: Mobile menu toggle + Context badge */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-xl p-2 sm:p-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none lg:hidden cursor-pointer shrink-0"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Business Title in Topbar */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-base font-extrabold font-khmer text-amber-600 dark:text-amber-400 truncate whitespace-nowrap max-w-[130px] xs:max-w-[200px] sm:max-w-none">
            ភោជនីយដ្ឋាននាគមាសសន្តិភាព2
          </span>
        </div>
      </div>

      {/* Right side: Language Switcher + Theme Switcher + User Profile + Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <LanguageSwitcher />
        <ThemeSwitcher />

        {/* User badge */}
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-gradient text-zinc-950 font-black text-sm shadow-2xs">
            <User className="h-5 w-5" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
              {session?.user?.name || 'Staff User'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-none font-semibold font-khmer">
              {session?.user?.role === 'ADMIN' ? t('auth.roleAdmin') : t('auth.roleStaff')}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="p-2 sm:p-2.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus:outline-none cursor-pointer"
          title={t('nav.logout')}
          aria-label={t('nav.logout')}
        >
          <LogOut className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </button>
      </div>
    </header>
  )
}
