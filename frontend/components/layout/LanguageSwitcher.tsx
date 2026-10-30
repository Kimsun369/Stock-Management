'use client'

import React from 'react'
import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useI18n()

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/90 p-0.5 sm:p-1 text-xs sm:text-sm font-bold shadow-xs select-none ${className}`}
      role="group"
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => setLanguage('km')}
        className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all duration-150 font-khmer cursor-pointer text-xs sm:text-sm ${
          language === 'km'
            ? 'bg-amber-400 text-zinc-950 font-extrabold shadow-xs'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50'
        }`}
        title="ប្ដូរទៅភាសាខ្មែរ"
      >
        <span>ខ្មែរ</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all duration-150 cursor-pointer text-xs sm:text-sm ${
          language === 'en'
            ? 'bg-amber-400 text-zinc-950 font-extrabold shadow-xs'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50'
        }`}
        title="Switch to English"
      >
        <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span>EN</span>
      </button>
    </div>
  )
}
