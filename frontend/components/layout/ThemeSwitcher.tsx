'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { useI18n } from '@/lib/i18n-context'

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme()
  const { language } = useI18n()

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-amber-400 hover:border-amber-400/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
      title={isDark ? (language === 'km' ? 'ប្ដូរទៅពន្លឺ (Light Mode)' : 'Switch to Light Mode') : (language === 'km' ? 'ប្ដូរទៅងងឹត (Dark Mode)' : 'Switch to Dark Mode')}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 -rotate-12 hover:rotate-0" />
      )}
    </button>
  )
}
