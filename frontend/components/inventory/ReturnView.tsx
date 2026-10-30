'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Undo2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ReturnView() {
  const { t, language, formatDate } = useI18n()
  const { data: products } = useSWR('/api/products?limit=100', fetcher)
  const { data: recentReturns, mutate: mutateRecent } = useSWR('/api/stock/return?limit=10', fetcher)

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('6')
  const [reason, setReason] = useState('unopenedGuestReturn')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []

  const reasonOptions = [
    { value: 'unopenedGuestReturn', label: t('returnedItems.reasons.unopenedGuestReturn') },
    { value: 'cancelledRoomOrder', label: t('returnedItems.reasons.cancelledRoomOrder') },
    { value: 'overstockRoomReturn', label: t('returnedItems.reasons.overstockRoomReturn') },
  ]

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
          productId: productId || productList[0]?.id,
          quantity: Number(quantity),
          reason: t(`returnedItems.reasons.${reason}`),
          notes,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to process return')

      setSuccessMsg(true)
      setNotes('')
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
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name} (${p.sku})`,
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
              onChange={(e) => setProductId(e.target.value)}
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
                label={t('returnedItems.reason')}
                options={reasonOptions}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Input
              label={t('common.notes')}
              placeholder="Verification notes / កំណត់ចំណាំត្រួតពិនិត្យ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
              <Undo2 className="w-4 h-4" />
              <span>{t('returnedItems.submit')}</span>
            </Button>
          </form>
        </div>

        {/* Recent Returns List */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-gray-900 mb-3">{t('dashboard.recentTransactions')}</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {(recentReturns || []).map((item: any) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between font-semibold text-gray-800">
                  <span className="truncate pr-2">{item.productName}</span>
                  <span className="text-emerald-600 font-bold">+{item.quantity}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>{item.reason}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
            ))}
            {(!recentReturns || recentReturns.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-6">{t('common.noRecords')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

