'use client'

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Settings, Save, CheckCircle2, Database } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SettingsView() {
  const { t, setLanguage, setNumeralSystem } = useI18n()
  const { data: settings, mutate } = useSWR('/api/settings', fetcher)

  const [defaultLanguage, setDefaultLanguage] = useState('km')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState('4100')
  const [numeralSystem, setNumeral] = useState('western')
  const [globalLowStock, setGlobalLowStock] = useState('5')
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedSuccess, setSeedSuccess] = useState(false)

  useEffect(() => {
    if (settings) {
      if (settings.defaultLanguage) setDefaultLanguage(settings.defaultLanguage)
      if (settings.defaultCurrency) setDefaultCurrency(settings.defaultCurrency)
      if (settings.exchangeRateUsdKhr) setExchangeRate(settings.exchangeRateUsdKhr)
      if (settings.numeralSystem) setNumeral(settings.numeralSystem)
      if (settings.lowStockGlobalThreshold) setGlobalLowStock(settings.lowStockGlobalThreshold)
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultLanguage,
          defaultCurrency,
          exchangeRateUsdKhr: exchangeRate,
          numeralSystem,
          lowStockGlobalThreshold: globalLowStock,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        setLanguage(defaultLanguage as any)
        setNumeralSystem(numeralSystem as any)
        mutate()
        setTimeout(() => setSuccess(false), 4000)
      }
    } catch {
      alert('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunSeed = async () => {
    if (!window.confirm('Populate development database with bilingual categories, products, and sample customer leftovers?')) return
    setIsSeeding(true)
    setSeedSuccess(false)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        setSeedSuccess(true)
        mutate()
        setTimeout(() => setSeedSuccess(false), 4000)
      }
    } catch {
      alert('Seed failed')
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-khmer">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 shadow-2xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{t('settings.success')}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-[#111116] luxury-card p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 font-khmer">
          Localization & Accounting Rules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('settings.defaultLanguage')}
            options={[
              { value: 'km', label: 'ភាសាខ្មែរ (Khmer)' },
              { value: 'en', label: 'English' },
            ]}
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
          />

          <Select
            label={t('settings.defaultCurrency')}
            options={[
              { value: 'USD', label: 'US Dollar (USD $)' },
              { value: 'KHR', label: 'Cambodian Riel (KHR ៛)' },
            ]}
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('settings.exchangeRate')}
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            placeholder="4100"
          />

          <Select
            label={t('settings.numeralSystem')}
            options={[
              { value: 'western', label: t('settings.numeralWestern') },
              { value: 'khmer', label: t('settings.numeralKhmer') },
            ]}
            value={numeralSystem}
            onChange={(e) => setNumeral(e.target.value)}
          />
        </div>

        <div className="max-w-xs">
          <Input
            label={t('settings.globalLowStock')}
            type="number"
            min="1"
            value={globalLowStock}
            onChange={(e) => setGlobalLowStock(e.target.value)}
          />
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <Button type="submit" variant="primary" size="md" isLoading={isSaving} className="w-full sm:w-auto justify-center">
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{t('settings.save')}</span>
          </Button>
        </div>
      </form>

      {/* $0 Google Sheets & Seed Tools */}
      <div className="bg-white dark:bg-[#111116] luxury-card p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-900 dark:text-white">
          <Database className="w-4 h-4 text-amber-500" />
          <span>Zero-Cost ($0) Google Sheets Database Deployment</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
          The database runs 100% free with Google Sheets API and a Google Cloud Service Account.
          All tables (Products, StockTransactions, CustomerRecords, CustomerItems, Suppliers, Users)
          are synced real-time directly to your Google Sheet without paid database subscriptions.
        </p>

        {seedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 font-semibold">
            Seed data generated successfully! Products and initial inventory are ready.
          </div>
        )}

        <Button
          type="button"
          onClick={handleRunSeed}
          variant="secondary"
          size="sm"
          isLoading={isSeeding}
          className="w-full sm:w-auto justify-center"
        >
          <Database className="w-4 h-4 text-amber-500" />
          <span>Populate Bilingual Seed Data (Dev / Demo)</span>
        </Button>
      </div>
    </div>
  )
}
