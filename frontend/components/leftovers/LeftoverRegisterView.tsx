'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { formatUnitLabel } from '@/lib/unit-labels'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface LeftoverItemInput {
  productId: string
  quantity: number
  unit: string
}

export function LeftoverRegisterView() {
  const { t, language } = useI18n()
  const router = useRouter()
  const { data: products } = useSWR('/api/products?limit=100', fetcher)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [storageLocation, setStorageLocation] = useState('Locker #14 (ទូផ្ញើលេខ ១៤)')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LeftoverItemInput[]>([
    { productId: '', quantity: 12, unit: 'can' },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const productList = products?.products || []

  const handleAddItem = () => {
    setItems([...items, { productId: productList[0]?.id || '', quantity: 6, unit: 'can' }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof LeftoverItemInput, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'productId') {
      const p = productList.find((item: any) => item.id === value)
      if (p) updated[index].unit = p.unit || 'can'
    }
    setItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    // Ensure first product has valid ID
    const formattedItems = items.map((it) => ({
      ...it,
      productId: it.productId || productList[0]?.id,
      quantity: Number(it.quantity),
    }))

    try {
      const res = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          storageLocation,
          notes,
          items: formattedItems,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to register leftover')

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/customer-leftovers')
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message.includes('INSUFFICIENT_STOCK') ? t('errors.INSUFFICIENT_STOCK') : err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const productOptions = productList.map((p: any) => ({
    value: p.id,
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name} — Available: ${p.availableStock}`,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/customer-leftovers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('customerLeftovers.registerNew')}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('customerLeftovers.subtitle')}</p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{t('customerLeftovers.successRegister')}. Redirecting...</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        {/* Customer Information */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2">Customer Details / ព័ត៌មានភ្ញៀវ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('customerLeftovers.customerName')}
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Vireak Rith (វីរៈ រិទ្ធ)"
            />
            <Input
              label={t('customerLeftovers.customerPhone')}
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="012 345 678 or ០១២៣៤៥៦៧៨"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('customerLeftovers.storageLocation')}
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Locker #14 / ធ្នើលេខ ១៤"
            />
            <Input
              label={t('common.notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Room 8 leftover drinks"
            />
          </div>
        </div>

        {/* Items to Reserve */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900">
              {t('customerLeftovers.items')} (Held for Customer)
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="w-3.5 h-3.5" />
              <span>{t('customerLeftovers.addItem')}</span>
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const selectedProd = productList.find(
                (p: any) => p.id === (item.productId || productList[0]?.id)
              )
              const available = selectedProd ? selectedProd.availableStock : 0

              return (
                <div key={idx} className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <Select
                        label={t('stockIn.product')}
                        options={productOptions}
                        value={item.productId || productList[0]?.id || ''}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label={t('common.quantity')}
                        type="number"
                        min="1"
                        max={available > 0 ? available : 1}
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {selectedProd && (
                    <p className="text-[10px] text-gray-500">
                      Available to reserve: <b>{available} {formatUnitLabel(selectedProd.unit, t)}</b>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Link href="/dashboard/customer-leftovers" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto justify-center">
              {t('common.cancel')}
            </Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={isLoading} className="w-full sm:w-auto justify-center">
            <Clock className="w-4 h-4" />
            <span>{t('customerLeftovers.registerNew')}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}

