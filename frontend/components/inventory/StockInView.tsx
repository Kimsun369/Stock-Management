'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { ArrowDownToLine, CheckCircle2, Calculator, Info, ChevronLeft, ChevronRight } from 'lucide-react'
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

export function StockInView() {
  const { t, language, formatNumber, formatCurrency, formatDate } = useI18n()
  const { data: products, mutate: mutateProducts } = useSWR('/api/products?limit=100', fetcher)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [detailItem, setDetailItem] = useState<any>(null)
  const { data: recentIn, mutate: mutateRecent } = useSWR(`/api/stock/in?limit=10&offset=${historyOffset}`, fetcher)

  const [productId, setProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [quantity, setQuantity] = useState('2')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []
  const activeProductId = productId || productList[0]?.id || ''
  const selectedProduct = productList.find((p: any) => p.id === activeProductId)

  // Use only the product's configured units; products without packaging stay in their base unit.
  const rawBase = selectedProduct?.unit || 'unit'
  const baseUnit = rawBase.includes('/') ? rawBase.split('/')[0].trim() : rawBase
  const altUnit = selectedProduct?.altUnit || ''
  const conversionRate = Number(selectedProduct?.conversionRate) > 1 ? Number(selectedProduct.conversionRate) : 1
  const hasConversion = Boolean(altUnit && conversionRate > 1)
  const currentUnit = selectedUnit || baseUnit
  const isAltUnitSelected = hasConversion && currentUnit.toLowerCase() === altUnit.toLowerCase()

  const qtyNum = Number(quantity) || 0
  const baseQuantityAdded = hasConversion && !isAltUnitSelected ? qtyNum * conversionRate : qtyNum

  const packageCost = Number(selectedProduct?.purchaseCost) || 0
  const unitCost = hasConversion ? packageCost / conversionRate : packageCost
  const totalCost = Number((isAltUnitSelected ? qtyNum * unitCost : qtyNum * packageCost).toFixed(2))

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

    try {
      const res = await fetch('/api/stock/in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: activeProductId,
          quantity: qtyNum,
          unit: currentUnit,
          invoiceNumber,
          description,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to record stock in')

      setSuccessMsg(true)
      setInvoiceNumber('')
      setDescription('')
      mutateRecent()
      mutateProducts()
      setTimeout(() => setSuccessMsg(false), 5000)
    } catch (err: any) {
      setErrorMsg(err.message)
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
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('stockIn.title')}</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('stockIn.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121216] p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          {successMsg && (
            <div className="mb-4 flex items-center gap-2 p-3.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{t('stockIn.success')}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label={t('stockIn.product')}
              required
              options={productOptions}
              value={activeProductId}
              onChange={(e) => handleProductChange(e.target.value)}
            />

            {selectedProduct && (
              <div className="p-3 bg-amber-400/10 dark:bg-amber-950/40 rounded-lg text-xs text-zinc-700 dark:text-zinc-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold">{t('products.physicalStock')}</span>
                  <span className="font-bold text-sm">
                    {formatStockQuantity(selectedProduct.physicalStock, selectedProduct.unit, selectedProduct.altUnit, selectedProduct.conversionRate, t)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold">{t('products.reservedStock')}</span>
                  <span className="font-bold text-sm text-amber-600">
                    {formatStockQuantity(selectedProduct.reservedStock, selectedProduct.unit, selectedProduct.altUnit, selectedProduct.conversionRate, t)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold">{t('dashboard.availableStock')}</span>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    {formatStockQuantity(selectedProduct.availableStock, selectedProduct.unit, selectedProduct.altUnit, selectedProduct.conversionRate, t)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('stockIn.quantityReceived')}
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Select
                label={t('stockIn.unitSelection')}
                required
                options={unitOptions}
                value={currentUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              />
            </div>

            {/* Live Unit Conversion Display */}
            {hasConversion && !isAltUnitSelected && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>{t('stockIn.unitConversionTitle')}</span>
                </div>
                <p className="text-xs text-emerald-800">
                  <span className="font-bold">{quantity} {getUnitText(baseUnit, t)}</span> × <span className="font-bold">{conversionRate} {getUnitText(altUnit, t)}</span> = <span className="font-extrabold text-emerald-950 underline">{baseQuantityAdded} {getUnitText(altUnit, t)}</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  {t('stockIn.conversionStockNote', { qty: baseQuantityAdded, unit: getUnitText(baseUnit, t) })}
                </p>
              </div>
            )}

            {/* Read-only purchase pricing configuration */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {t('stockIn.agreedPricingInfo')}
                </span>
                <span className="text-[10px] text-slate-500">{t('stockIn.readOnlyPricing')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('stockIn.unitCost')}</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatCurrency(packageCost)} / {getUnitText(baseUnit, t)}
                    {hasConversion && ` (${formatCurrency(unitCost)} / ${getUnitText(altUnit, t)})`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('stockIn.totalSpend')}</span>
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('stockIn.invoiceNumber')}
                placeholder="INV-2026-..."
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 font-khmer">
                {t('products.description')}
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181D] px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30" />
              </label>
            </div>

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
              <ArrowDownToLine className="w-4 h-4" />
              <span>{t('stockIn.submit')}</span>
            </Button>
          </form>
        </div>

        {/* Recent Stock In List */}
        <div className="bg-white dark:bg-[#121216] p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">{t('stockIn.recentStockIn')}</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {(recentIn || []).map((item: any) => (
              <button type="button" onClick={() => setDetailItem(item)} key={item.id} className="w-full text-left p-3 bg-gray-50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-xs space-y-1 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                <div className="flex justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                  <span className="truncate pr-2">{language === 'km' && item.productNameKm ? item.productNameKm : item.productName}</span>
                  <span className="text-emerald-600 font-bold">+{formatStockQuantity(item.quantity, item.productMainUnit, item.productMinorUnit, item.productConversionRate, t)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-[10px]">
                  <span className="truncate max-w-[140px]">{item.notes || item.reference || item.reason}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </button>
            ))}
            {(!recentIn || recentIn.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-6">{t('common.noRecords')}</p>
            )}
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" disabled={historyOffset === 0} onClick={() => setHistoryOffset(Math.max(0, historyOffset - 10))}><ChevronLeft className="w-4 h-4" />{t('common.previous')}</Button>
            <Button type="button" variant="outline" size="sm" disabled={!recentIn || recentIn.length < 10} onClick={() => setHistoryOffset(historyOffset + 10)}>{t('common.next')}<ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
      <TransactionDetail item={detailItem} onClose={() => setDetailItem(null)} language={language} t={t} formatDate={formatDate} />
    </div>
  )
}
