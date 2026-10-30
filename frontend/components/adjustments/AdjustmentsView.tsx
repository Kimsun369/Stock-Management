'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus, Check, X, FileCheck, AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { AdjustmentRequest } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Input } from '@/frontend/components/ui/Input'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AdjustmentsView({ userRole = 'STAFF' }: { userRole?: 'ADMIN' | 'STAFF' }) {
  const { t, language, formatDate } = useI18n()
  const { data: adjustments, isLoading, mutate } = useSWR<AdjustmentRequest[]>('/api/adjustments', fetcher)
  const { data: products } = useSWR('/api/products?limit=100', fetcher)

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [requestedChange, setRequestedChange] = useState('-2')
  const [reason, setReason] = useState('Broken bottle during cleaning')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []
  const selectedProd = productList.find((p: any) => p.id === (productId || productList[0]?.id))

  const handleOpenRequest = () => {
    setProductId(productList[0]?.id || '')
    setRequestedChange('-1')
    setReason('')
    setNotes('')
    setErrorMsg(null)
    setIsRequestModalOpen(true)
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProd.id,
          requestedChange: Number(requestedChange),
          reason,
          notes,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit request')

      setIsRequestModalOpen(false)
      mutate()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    const reviewNotes = window.prompt(
      `Enter admin review note for ${action.toUpperCase()}:`,
      action === 'approve' ? 'Approved count adjustment' : 'Rejected'
    )
    if (reviewNotes === null) return

    try {
      const res = await fetch(`/api/adjustments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNotes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to review')
      mutate()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const productOptions = productList.map((p: any) => ({
    value: p.id,
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name} (${p.sku}) — Current: ${p.physicalStock}`,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t('adjustments.title')}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('adjustments.subtitle')}</p>
        </div>
        <Button onClick={handleOpenRequest} variant="primary" size="sm" className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          <span>{t('adjustments.requestAdjustment')}</span>
        </Button>
      </div>

      <div className="bg-white dark:bg-[#121216] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[760px]">
          <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b">
            <tr>
              <th className="px-5 py-3">{t('adjustments.product')}</th>
              <th className="px-3 py-3 text-right">{t('adjustments.currentQty')}</th>
              <th className="px-3 py-3 text-right">{t('adjustments.requestedChange')}</th>
              <th className="px-4 py-3">{t('adjustments.reason')}</th>
              <th className="px-3 py-3">{t('common.status')}</th>
              <th className="px-3 py-3">{t('adjustments.submittedBy')}</th>
              <th className="px-4 py-3">{t('common.date')}</th>
              {userRole === 'ADMIN' && <th className="px-4 py-3 text-right">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : (adjustments || []).length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              (adjustments || []).map((adj) => (
                <tr key={adj.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3 font-semibold text-gray-900">{adj.productName}</td>
                  <td className="px-3 py-3 text-right text-gray-600 font-mono">{adj.currentQuantity}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    <span className={adj.requestedChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {adj.requestedChange > 0 ? `+${adj.requestedChange}` : adj.requestedChange}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{adj.reason}</td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        adj.status === 'APPROVED' ? 'success' : adj.status === 'PENDING' ? 'warning' : 'danger'
                      }
                    >
                      {t(`adjustments.statuses.${adj.status}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{adj.submittedByName || 'Staff'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(adj.createdAt)}</td>
                  {userRole === 'ADMIN' && (
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {adj.status === 'PENDING' ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReview(adj.id, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-[11px] py-1 px-2"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('adjustments.approve')}</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReview(adj.id, 'reject')}
                            className="text-[11px] py-1 px-2"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{t('adjustments.reject')}</span>
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          {adj.reviewNotes ? `Note: ${adj.reviewNotes}` : 'Reviewed'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title={t('adjustments.requestAdjustment')}
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          <Select
            label={t('adjustments.product')}
            required
            options={productOptions}
            value={productId || productList[0]?.id || ''}
            onChange={(e) => setProductId(e.target.value)}
          />

          {selectedProd && (
            <div className="p-3 bg-blue-50/60 rounded-lg text-xs text-blue-900 flex justify-between">
              <span>{t('adjustments.currentQty')}: <b>{selectedProd.physicalStock} {selectedProd.unit}</b></span>
              <span>
                {t('adjustments.resultingQty')}:{' '}
                <b>{Math.max(0, selectedProd.physicalStock + (Number(requestedChange) || 0))} {selectedProd.unit}</b>
              </span>
            </div>
          )}

          <Input
            label={t('adjustments.requestedChange')}
            type="number"
            required
            placeholder="e.g. -2 for damage, or +5 for found stock"
            value={requestedChange}
            onChange={(e) => setRequestedChange(e.target.value)}
          />

          <Input
            label={t('adjustments.reason')}
            required
            placeholder="e.g. Broken bottle during room clean-up"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Input
            label={t('adjustments.notes')}
            placeholder="Supporting notes / ភស្តុតាង"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              {t('common.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

