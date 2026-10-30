'use client'

import React from 'react'
import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

export function LanguageSwitch() {
  const { language, setLanguage } = useI18n()

  return (
    <div
      className="inline-flex items-center rounded-full border border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] bg-white/70 dark:bg-[#111113]/85 backdrop-blur-md p-1 shadow-sm select-none"
      role="group"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => setLanguage('km')}
        className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-200 font-khmer cursor-pointer ${
          language === 'km'
            ? 'bg-gradient-to-r from-[#F5D78E] via-[#E8B84A] to-[#C9962B] text-[#0A0A0B] shadow-[0_2px_8px_rgba(232,184,74,0.4)]'
            : 'text-[#78716C] dark:text-[#A8A29A] hover:text-[#1C1917] dark:hover:text-[#F4F1EA]'
        }`}
        title="ប្ដូរទៅភាសាខ្មែរ"
      >
        ខ្មែរ
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer ${
          language === 'en'
            ? 'bg-gradient-to-r from-[#F5D78E] via-[#E8B84A] to-[#C9962B] text-[#0A0A0B] shadow-[0_2px_8px_rgba(232,184,74,0.4)]'
            : 'text-[#78716C] dark:text-[#A8A29A] hover:text-[#1C1917] dark:hover:text-[#F4F1EA]'
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  )
}
