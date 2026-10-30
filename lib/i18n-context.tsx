'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import enMessages from '@/locales/en.json'
import kmMessages from '@/locales/km.json'
import { convertLatinToKhmerDigits } from '@/lib/phone'

export type Language = 'km' | 'en'
export type NumeralSystem = 'western' | 'khmer'

interface I18nContextType {
  language: Language
  numeralSystem: NumeralSystem
  setLanguage: (lang: Language) => void
  setNumeralSystem: (sys: NumeralSystem) => void
  t: (keyPath: string, vars?: Record<string, string | number>) => string
  formatNumber: (value: number | string) => string
  formatCurrency: (amount: number | string, currency?: string) => string
  formatDate: (date: string | Date | null | undefined, includeTime?: boolean) => string
}

const messages: Record<Language, any> = {
  en: enMessages,
  km: kmMessages,
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({
  children,
  initialLanguage = 'km',
  initialNumeral = 'western',
}: {
  children: React.ReactNode
  initialLanguage?: Language
  initialNumeral?: NumeralSystem
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const [numeralSystem, setNumeralSystemState] = useState<NumeralSystem>(initialNumeral)

  useEffect(() => {
    // 1. Check localStorage first
    try {
      const storedLang = localStorage.getItem('preferredLanguage')
      if (storedLang === 'km' || storedLang === 'en') {
        setLanguageState(storedLang as Language)
        document.documentElement.lang = storedLang
        return
      }
    } catch {}

    // 2. Fallback to cookie
    const match = document.cookie.match(/preferredLanguage=(km|en)/)
    if (match && (match[1] === 'km' || match[1] === 'en')) {
      setLanguageState(match[1] as Language)
      document.documentElement.lang = match[1]
    } else {
      document.documentElement.lang = initialLanguage
    }

    const numMatch = document.cookie.match(/numeralSystem=(western|khmer)/)
    if (numMatch && (numMatch[1] === 'western' || numMatch[1] === 'khmer')) {
      setNumeralSystemState(numMatch[1] as NumeralSystem)
    }
  }, [initialLanguage])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('preferredLanguage', lang)
    } catch {}
    document.cookie = `preferredLanguage=${lang}; path=/; max-age=31536000`
    document.documentElement.lang = lang

    // Also update server preference asynchronously if user is signed in
    fetch('/api/user/preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lang }),
    }).catch(() => {})
  }

  const setNumeralSystem = (sys: NumeralSystem) => {
    setNumeralSystemState(sys)
    document.cookie = `numeralSystem=${sys}; path=/; max-age=31536000`
  }

  // Deep key lookup helper: "customerLeftovers.statuses.HELD"
  const t = (keyPath: string, vars?: Record<string, string | number>): string => {
    const keys = keyPath.split('.')
    let val: any = messages[language]
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k]
      } else {
        val = undefined
        break
      }
    }

    // Fallback to English if missing in active language
    if (val === undefined || val === null) {
      let fallback: any = messages.en
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = fallback[k]
        } else {
          fallback = undefined
          break
        }
      }
      val = fallback !== undefined ? fallback : keyPath
    }

    if (typeof val !== 'string') {
      return String(val ?? keyPath)
    }

    // Variable interpolation: {available}
    if (vars) {
      return val.replace(/\{(\w+)\}/g, (_, name) => {
        return name in vars ? String(vars[name]) : `{${name}}`
      })
    }

    return val
  }

  const formatNumber = (value: number | string): string => {
    const num = Number(value)
    if (isNaN(num)) return String(value)
    const formatted = num.toLocaleString('en-US')
    return numeralSystem === 'khmer' ? convertLatinToKhmerDigits(formatted) : formatted
  }

  const formatCurrency = (amount: number | string, currency = 'USD'): string => {
    const num = Number(amount)
    if (isNaN(num)) return String(amount)

    if (currency === 'KHR') {
      const formatted = Math.round(num).toLocaleString('en-US')
      const digits = numeralSystem === 'khmer' ? convertLatinToKhmerDigits(formatted) : formatted
      return `${digits} ៛`
    }

    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const digits = numeralSystem === 'khmer' ? convertLatinToKhmerDigits(formatted) : formatted
    return `$${digits}`
  }

  const formatDate = (date: string | Date | null | undefined, includeTime = false): string => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'

    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Phnom_Penh',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
      }
      const locale = language === 'km' ? 'km-KH' : 'en-US'
      let formatted = new Intl.DateTimeFormat(locale, options).format(d)
      if (numeralSystem === 'western') {
        // keep western digits even if km locale was used
        const KHMER_TO_LATIN: Record<string, string> = {
          '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
          '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9',
        }
        formatted = formatted.replace(/[០-៩]/g, (ch) => KHMER_TO_LATIN[ch] || ch)
      } else if (numeralSystem === 'khmer') {
        formatted = convertLatinToKhmerDigits(formatted)
      }
      return formatted
    } catch {
      return d.toLocaleDateString()
    }
  }

  return (
    <I18nContext.Provider
      value={{
        language,
        numeralSystem,
        setLanguage,
        setNumeralSystem,
        t,
        formatNumber,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

