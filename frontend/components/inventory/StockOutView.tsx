'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { ArrowUpFromLine, CheckCircle2, AlertCircle, Calculator, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { formatStockQuantity } from '@/lib/unit-labels'
import { TransactionDetail } from '@/frontend/components/inventory/TransactionDetail'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getUnitText(u: string, t: (k: string) => string): string {
  if (!u) return ''
  const clean = u.replace(/^products\.units\./, '').toLowerCase().trim()
  const base = clean.split('/')[0]
  const trans = t(`products.units.${base}`)
  if (trans && !trans.startsWith('products.units.')) return trans
  const direct = t(`products.units.${clean}`)
  if (direct && !direct.startsWith('products.units.')) return direct
  if (clean === 'can') return 'កំប៉ុង'
  if (clean === 'box') return 'កេស'
  if (clean === 'bottle') return 'ដប'
  if (clean === 'carton') return 'កេស'
  if (clean === 'pack') return 'កញ្ចប់'
  return u
}

export function StockOutView() {
  const { t, language, formatNumber, formatCurrency, formatDate } = useI18n()
  const { data: products, mutate: mutateProducts } = useSWR('/api/products?limit=100', fetcher)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [detailItem, setDetailItem] = useState<any>(null)
  const { data: recentOut, mutate: mutateRecent } = useSWR(`/api/stock/out?limit=10&offset=${historyOffset}`, fetcher)

  const [productId, setProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('Room 101')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []
  const activeProductId = productId || productList[0]?.id || ''
  const selectedProduct = productList.find((p: any) => p.id === activeProductId)
  const availableStock = selectedProduct ? selectedProduct.availableStock : 0

  // Use only the product's configured units; products without packaging stay in their base unit.
  const rawBase = selectedProduct?.unit || 'unit'
  const baseUnit = rawBase.includes('/') ? rawBase.split('/')[0].trim() : rawBase
  const altUnit = selectedProduct?.altUnit || ''
  const conversionRate = Number(selectedProduct?.conversionRate) > 1 ? Number(selectedProduct.conversionRate) : 1
  const hasConversion = Boolean(altUnit && conversionRate > 1)
  const currentUnit = selectedUnit || baseUnit
  const isAltUnitSelected = hasConversion && currentUnit.toLowerCase() === altUnit.toLowerCase()

  const qtyNum = Number(quantity) || 0
  const baseQuantityDeducted = hasConversion && !isAltUnitSelected ? qtyNum * conversionRate : qtyNum
  const packageCost = Number(selectedProduct?.purchaseCost) || 0
  const baseUnitCost = hasConversion ? packageCost / conversionRate : packageCost

  const handleProductChange = (id: string) => {
    setProductId(id)
    const p = productList.find((item: any) => item.id === id)
    const pBase = (p?.unit || 'unit').split('/')[0].trim()
    setSelectedUnit(pBase)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(false)

    if (baseQuantityDeducted > availableStock) {
      setErrorMsg(
        t('stockOut.insufficientDetailed', {
          requested: baseQuantityDeducted,
          available: availableStock,
          unit: t(`products.units.${baseUnit}`) || baseUnit,
        })
      )
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/stock/out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: qtyNum,
          unit: currentUnit,
          reason,
          reference,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to record stock out')

      setSuccessMsg(true)
      setReason('')
      setHistoryOffset(0)
      mutateRecent()
      mutateProducts()
      setTimeout(() => setSuccessMsg(false), 5000)
    } catch (err: any) {
      setErrorMsg(err.message === 'INSUFFICIENT_STOCK' ? t('errors.INSUFFICIENT_STOCK') : err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const productOptions = productList.map((p: any) => ({
    value: p.id,
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name} — ${t('dashboard.availableStock')}: ${formatStockQuantity(p.availableStock, p.unit, p.altUnit, p.conversionRate, t)}`,
  }))

  const unitOptions = selectedProduct
    ? [
        { value: baseUnit, label: getUnitText(baseUnit, t) },
        ...(hasConversion ? [{ value: altUnit, label: `${getUnitText(altUnit, t)} (1 ${getUnitText(baseUnit, t)} = ${conversionRate} ${getUnitText(altUnit, t)})` }] : []),
      ]
    : []


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('stockOut.title')}</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('stockOut.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121216] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          {successMsg && (
            <div className="mb-4 flex items-center gap-2 p-3.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{t('stockOut.success')}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 p-3.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label={t('stockOut.product')}
              required
              options={productOptions}
              value={activeProductId}
              onChange={(e) => handleProductChange(e.target.value)}
            />

            {selectedProduct && (
              <div className="p-3.5 bg-amber-400/10 dark:bg-amber-400/15/70 rounded-lg text-xs text-blue-900 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold">{t('products.physicalStock')}</span>
                  <span className="font-bold text-sm">
                    {formatNumber(selectedProduct.physicalStock)} {getUnitText(baseUnit, t)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold">{t('products.reservedStock')}</span>
                  <span className="font-bold text-sm text-amber-600">
                    {formatNumber(selectedProduct.reservedStock)} {getUnitText(baseUnit, t)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold">{t('dashboard.availableStock')}</span>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    {formatNumber(selectedProduct.availableStock)} {getUnitText(baseUnit, t)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('stockOut.quantityDispensed')}
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Select
                label={t('stockOut.unitSelection')}
                required
                options={unitOptions}
                value={currentUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              />
            </div>

            {/* Live Unit Conversion Display */}
            {hasConversion && !isAltUnitSelected && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span>{t('stockOut.unitConversionTitle')}</span>
                </div>
                <p className="text-xs text-amber-800">
                  <span className="font-bold">{quantity} {getUnitText(baseUnit, t)}</span> × <span className="font-bold">{conversionRate} {getUnitText(altUnit, t)}</span> = <span className="font-extrabold text-amber-950 underline">{baseQuantityDeducted} {getUnitText(altUnit, t)}</span>
                </p>
                <p className="text-[11px] text-amber-700">
                  {t('stockOut.conversionDeductNote', { qty: baseQuantityDeducted, unit: getUnitText(baseUnit, t) })}
                </p>
              </div>
            )}

            {selectedProduct && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                <span className="mr-2 text-xs font-semibold">{t('products.purchaseCost')}:</span>
                {formatCurrency(packageCost)} / {getUnitText(baseUnit, t)}
                {hasConversion && <span className="ml-2 text-xs text-slate-500">({formatCurrency(baseUnitCost)} / {getUnitText(baseUnit, t)})</span>}
                <span className="ml-2 text-xs text-slate-500">{t('stockIn.readOnlyPricing')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('stockOut.reference')}
                placeholder="Room 101, Bar, VIP..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 font-khmer">
              {t('products.description')}<span className="text-rose-500 ml-0.5">*</span>
              <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30" />
            </label>

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
              <ArrowUpFromLine className="w-4 h-4" />
              <span>{t('stockOut.submit')}</span>
            </Button>
          </form>
        </div>

        {/* Recent Stock Out List */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">{t('stockOut.recentStockOut')}</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {(recentOut || []).map((item: any) => (
              <button type="button" onClick={() => setDetailItem(item)} key={item.id} className="w-full text-left p-3 bg-gray-50 hover:bg-amber-50 rounded-lg text-xs space-y-1 border border-transparent hover:border-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                <div className="flex justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                  <span className="truncate pr-2">{language === 'km' && item.productNameKm ? item.productNameKm : item.productName}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">-{formatStockQuantity(item.quantity, item.productMainUnit, item.productMinorUnit, item.productConversionRate, t)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-[10px]">
                  <span className="truncate max-w-[140px]">{item.notes || item.reference || item.reason}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </button>
            ))}
            {(!recentOut || recentOut.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-6">{t('common.noRecords')}</p>
            )}
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" disabled={historyOffset === 0} onClick={() => setHistoryOffset(Math.max(0, historyOffset - 10))}><ChevronLeft className="w-4 h-4" />{t('common.previous')}</Button>
            <Button type="button" variant="outline" size="sm" disabled={!recentOut || recentOut.length < 10} onClick={() => setHistoryOffset(historyOffset + 10)}>{t('common.next')}<ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
      <TransactionDetail item={detailItem} onClose={() => setDetailItem(null)} language={language} t={t} formatDate={formatDate} />
    </div>
  )
}
