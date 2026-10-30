'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { ArrowDownToLine, CheckCircle2, Calculator, Info } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'

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
  const { data: recentIn, mutate: mutateRecent } = useSWR('/api/stock/in?limit=10', fetcher)

  const [productId, setProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [quantity, setQuantity] = useState('2')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []
  const activeProductId = productId || productList[0]?.id || ''
  const selectedProduct = productList.find((p: any) => p.id === activeProductId)

  // Determine available units for selected product with guaranteed two scales
  const rawBase = selectedProduct?.unit || 'can'
  const baseUnit = rawBase.includes('/') ? rawBase.split('/')[0].trim() : rawBase
  const defaultAlt = baseUnit === 'bottle' ? 'carton' : (baseUnit === 'pack' ? 'box' : 'box')
  const altUnit = selectedProduct?.altUnit || defaultAlt
  const conversionRate = Number(selectedProduct?.conversionRate) > 1 ? Number(selectedProduct.conversionRate) : 24
  const hasConversion = true

  // Default selected unit to alternative unit (packaging unit) so staff can easily enter Boxes
  const currentUnit = selectedUnit || altUnit

  const isAltUnitSelected = currentUnit.toLowerCase() === altUnit.toLowerCase()
  const qtyNum = Number(quantity) || 0
  const baseQuantityAdded = isAltUnitSelected ? qtyNum * conversionRate : qtyNum

  const unitCost = Number(selectedProduct?.purchaseCost) || 0
  const totalCost = Number((unitCost * baseQuantityAdded).toFixed(2))

  const handleProductChange = (id: string) => {
    setProductId(id)
    const p = productList.find((item: any) => item.id === id)
    if (p?.altUnit && Number(p.conversionRate) > 1) {
      setSelectedUnit(p.altUnit)
    } else {
      const pBase = (p?.unit || 'can').split('/')[0].trim()
      setSelectedUnit(pBase === 'bottle' ? 'carton' : 'box')
    }
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
          notes,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to record stock in')

      setSuccessMsg(true)
      setInvoiceNumber('')
      setNotes('')
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
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name} (${p.sku}) — ${t('dashboard.availableStock')}: ${p.availableStock} ${getUnitText(p.unit, t)}`,
  }))

  const unitOptions = selectedProduct
    ? [
        {
          value: baseUnit,
          label: `${getUnitText(baseUnit, t)} (${t('products.mainUnit')})`,
        },
        {
          value: altUnit,
          label: `${getUnitText(altUnit, t)} (1 ${getUnitText(altUnit, t)} = ${conversionRate} ${getUnitText(baseUnit, t)})`,
        },
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
              <div className="p-3 bg-amber-400/10 dark:bg-amber-400/15/70 rounded-lg text-xs text-blue-900 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
            {isAltUnitSelected && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>{t('stockIn.unitConversionTitle')}</span>
                </div>
                <p className="text-xs text-emerald-800">
                  <span className="font-bold">{quantity} {getUnitText(altUnit, t)}</span> × <span className="font-bold">{conversionRate} {getUnitText(baseUnit, t)}</span> = <span className="font-extrabold text-emerald-950 underline">{baseQuantityAdded} {getUnitText(baseUnit, t)}</span>
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
                    {formatCurrency(unitCost)} / {getUnitText(baseUnit, t)}
                    {hasConversion && ` (${formatCurrency(unitCost * conversionRate)} / ${getUnitText(altUnit, t)})`}
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
              <Input
                label={t('stockIn.notes')}
                placeholder="Delivery notes / កំណត់ចំណាំ"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
              <ArrowDownToLine className="w-4 h-4" />
              <span>{t('stockIn.submit')}</span>
            </Button>
          </form>
        </div>

        {/* Recent Stock In List */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">{t('stockIn.recentStockIn')}</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {(recentIn || []).map((item: any) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                  <span className="truncate pr-2">{item.productName}</span>
                  <span className="text-emerald-600 font-bold">+{item.quantity}</span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-[10px]">
                  <span className="truncate max-w-[140px]">{item.notes || item.reference || item.reason}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
            ))}
            {(!recentIn || recentIn.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-6">{t('common.noRecords')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
