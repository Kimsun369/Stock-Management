'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { useI18n } from '@/lib/i18n-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { language } = useI18n()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center h-8.5 w-8.5 rounded-full border border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] bg-white/60 dark:bg-[#111113]/80 backdrop-blur-md text-[#78716C] dark:text-[#E8B84A] hover:text-[#1C1917] dark:hover:text-[#F5D78E] hover:border-[#E8B84A] transition-all duration-200 focus:outline-none shadow-sm cursor-pointer"
      title={
        isDark
          ? language === 'km'
            ? 'ប្ដូរទៅពន្លឺ (Light)'
            : 'Switch to Light'
          : language === 'km'
          ? 'ប្ដូរទៅងងឹត (Dark)'
          : 'Switch to Dark'
      }
      aria-label="Toggle color theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  )
}

