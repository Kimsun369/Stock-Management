'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Undo2, CheckCircle2, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { formatStockQuantity } from '@/lib/unit-labels'
import { TransactionDetail } from '@/frontend/components/inventory/TransactionDetail'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ReturnView() {
  const { t, language, formatDate } = useI18n()
  const { data: products } = useSWR('/api/products?limit=100', fetcher)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [detailItem, setDetailItem] = useState<any>(null)
  const { data: recentReturns, mutate: mutateRecent } = useSWR(`/api/stock/return?limit=10&offset=${historyOffset}`, fetcher)

  const [productId, setProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [quantity, setQuantity] = useState('6')
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []
  const activeProductId = productId || productList[0]?.id || ''
  const selectedProduct = productList.find((p: any) => p.id === activeProductId)
  const baseUnit = (selectedProduct?.unit || 'unit').split('/')[0].trim()
  const altUnit = selectedProduct?.altUnit || ''
  const conversionRate = Number(selectedProduct?.conversionRate) > 1 ? Number(selectedProduct.conversionRate) : 1
  const hasConversion = Boolean(altUnit && conversionRate > 1)
  const currentUnit = selectedUnit || baseUnit
  const quantityInBase = Number(quantity || 0) * (hasConversion && currentUnit.toLowerCase() !== altUnit.toLowerCase() ? conversionRate : 1)
  const unitText = (value: string) => {
    const fallback: Record<string, string> = { can: 'កំប៉ុង', bottle: 'ដប', box: 'កេស', carton: 'កេស', piece: 'ដុំ', pack: 'កញ្ចប់', unit: 'មុខ' }
    const key = value.replace(/^products\.units\./, '')
    const translated = t(`products.units.${key}`)
    return translated.startsWith('products.units.') ? (fallback[key] || key) : translated
  }
  const unitOptions = selectedProduct ? [
    { value: baseUnit, label: unitText(baseUnit) },
    ...(hasConversion ? [{ value: altUnit, label: `${unitText(altUnit)} (1 ${unitText(baseUnit)} = ${conversionRate} ${unitText(altUnit)})` }] : []),
  ] : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(false)

    try {
      const res = await fetch('/api/stock/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: activeProductId,
          quantity: Number(quantity),
          unit: currentUnit,
          reason,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to process return')

      setSuccessMsg(true)
      setReason('')
      setHistoryOffset(0)
      mutateRecent()
      setTimeout(() => setSuccessMsg(false), 4000)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const productOptions = productList.map((p: any) => ({
    value: p.id,
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name}`,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('returnedItems.title')}</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('returnedItems.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#121216] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          {/* Eligibility warning note */}
          <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('returnedItems.eligibilityWarning')}</p>
          </div>

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('returnedItems.success')}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label={t('returnedItems.product')}
              required
              options={productOptions}
              value={productId || productList[0]?.id || ''}
              onChange={(e) => { setProductId(e.target.value); const p = productList.find((item: any) => item.id === e.target.value); setSelectedUnit((p?.unit || 'unit').split('/')[0].trim()) }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('returnedItems.quantity')}
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Select
                label={t('stockIn.unitSelection')}
                options={unitOptions}
                value={currentUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              />
            </div>
            {hasConversion && currentUnit.toLowerCase() === altUnit.toLowerCase() && (
              <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                {quantity} {unitText(altUnit)} = {quantityInBase} {unitText(baseUnit)}
              </p>
            )}
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 font-khmer">
              {t('products.description')}<span className="text-rose-500 ml-0.5">*</span>
              <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30" />
            </label>

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
              <Undo2 className="w-4 h-4" />
              <span>{t('returnedItems.submit')}</span>
            </Button>
          </form>
        </div>

        {/* Recent Returns List */}
        <div className="bg-white dark:bg-[#121216] p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3">{t('dashboard.recentTransactions')}</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {(recentReturns || []).map((item: any) => (
              <button type="button" onClick={() => setDetailItem(item)} key={item.id} className="w-full text-left p-3 bg-gray-50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-xs space-y-1 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                <div className="flex justify-between font-semibold text-gray-800 dark:text-zinc-200">
                  <span className="truncate pr-2">{language === 'km' && item.productNameKm ? item.productNameKm : item.productName}</span>
                  <span className="text-emerald-600 font-bold">+{formatStockQuantity(item.quantity, item.productMainUnit, item.productMinorUnit, item.productConversionRate, t)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-zinc-400 text-[10px]">
                  <span>{item.reason}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </button>
            ))}
            {(!recentReturns || recentReturns.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-6">{t('common.noRecords')}</p>
            )}
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" disabled={historyOffset === 0} onClick={() => setHistoryOffset(Math.max(0, historyOffset - 10))}><ChevronLeft className="w-4 h-4" />{t('common.previous')}</Button>
            <Button type="button" variant="outline" size="sm" disabled={!recentReturns || recentReturns.length < 10} onClick={() => setHistoryOffset(historyOffset + 10)}>{t('common.next')}<ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
      <TransactionDetail item={detailItem} onClose={() => setDetailItem(null)} language={language} t={t} formatDate={formatDate} />
    </div>
  )
}

