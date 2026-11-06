'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { formatStockQuantity, formatUnitLabel } from '@/lib/unit-labels'
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
  const [detailAdjustment, setDetailAdjustment] = useState<AdjustmentRequest | null>(null)
  const [productId, setProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [requestedChange, setRequestedChange] = useState('-2')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const productList = products?.products || []
  const selectedProd = productList.find((p: any) => p.id === (productId || productList[0]?.id))
  const mainUnit = selectedProd?.unit || 'unit'
  const minorUnit = selectedProd?.altUnit || ''
  const conversionRate = Number(selectedProd?.conversionRate) > 1 ? Number(selectedProd.conversionRate) : 1
  const hasConversion = Boolean(minorUnit && conversionRate > 1)
  const currentUnit = selectedUnit || mainUnit
  const isMainUnit = currentUnit.toLowerCase() === mainUnit.toLowerCase()
  const requestedChangeInStockUnits = (Number(requestedChange) || 0) * (hasConversion && isMainUnit ? conversionRate : 1)
  const unitOptions = selectedProd ? [
    { value: mainUnit, label: formatUnitLabel(mainUnit, t) },
    ...(hasConversion ? [{ value: minorUnit, label: formatUnitLabel(minorUnit, t) }] : []),
  ] : []

  const handleOpenRequest = () => {
    setProductId(productList[0]?.id || '')
    setSelectedUnit(productList[0]?.unit || '')
    setRequestedChange('-1')
    setDescription('')
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
          requestedChange: requestedChangeInStockUnits,
          reason: description,
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

  const productOptions = productList.map((p: any) => ({
    value: p.id,
    label: `${language === 'km' && p.nameKm ? p.nameKm : p.name} — ${t('adjustments.currentQty')}: ${formatStockQuantity(p.physicalStock, p.unit, p.altUnit, p.conversionRate, t)}`,
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
              <th className="px-4 py-3">{t('products.description')}</th>
              <th className="px-3 py-3">{t('common.status')}</th>
              <th className="px-3 py-3">{t('adjustments.submittedBy')}</th>
              <th className="px-4 py-3">{t('common.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : (adjustments || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              (adjustments || []).map((adj) => (
                <tr key={adj.id} onClick={() => setDetailAdjustment(adj)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setDetailAdjustment(adj) }} tabIndex={0} role="button" aria-label={`${t('common.view')} ${adj.productName}`} className="cursor-pointer hover:bg-zinc-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400 dark:hover:bg-zinc-800/40">
                  <td className="px-5 py-3 font-semibold text-gray-900">{adj.productName}</td>
                  <td className="px-3 py-3 text-right text-gray-600 font-mono">
                    {formatStockQuantity(adj.currentQuantity, adj.productUnit, adj.productAltUnit, adj.productConversionRate, t)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    <span className={adj.requestedChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {adj.requestedChange > 0 ? '+' : '-'}{formatStockQuantity(Math.abs(adj.requestedChange), adj.productUnit, adj.productAltUnit, adj.productConversionRate, t)}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal isOpen={Boolean(detailAdjustment)} onClose={() => setDetailAdjustment(null)} title={detailAdjustment?.productName || t('adjustments.title')}>
        {detailAdjustment && <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div><dt className="text-xs text-zinc-500">{t('adjustments.currentQty')}</dt><dd className="font-medium">{formatStockQuantity(detailAdjustment.currentQuantity, detailAdjustment.productUnit, detailAdjustment.productAltUnit, detailAdjustment.productConversionRate, t)}</dd></div>
          <div><dt className="text-xs text-zinc-500">{t('adjustments.requestedChange')}</dt><dd className="font-semibold">{detailAdjustment.requestedChange > 0 ? '+' : '-'}{formatStockQuantity(Math.abs(detailAdjustment.requestedChange), detailAdjustment.productUnit, detailAdjustment.productAltUnit, detailAdjustment.productConversionRate, t)}</dd></div>
          <div><dt className="text-xs text-zinc-500">{t('products.description')}</dt><dd className="whitespace-pre-wrap">{detailAdjustment.reason || '—'}</dd></div>
          <div><dt className="text-xs text-zinc-500">{t('adjustments.submittedBy')}</dt><dd>{detailAdjustment.submittedByName || 'Staff'}</dd></div>
          <div><dt className="text-xs text-zinc-500">{t('common.status')}</dt><dd>{t(`adjustments.statuses.${detailAdjustment.status}`)}</dd></div>
          <div><dt className="text-xs text-zinc-500">{t('common.date')}</dt><dd>{formatDate(detailAdjustment.createdAt)}</dd></div>
          {detailAdjustment.reviewNotes && <div><dt className="text-xs text-zinc-500">{t('adjustments.reviewedBy')}</dt><dd>{detailAdjustment.reviewedByName || '—'} · {detailAdjustment.reviewNotes}</dd></div>}
        </dl>}
      </Modal>

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
            onChange={(e) => {
              const product = productList.find((p: any) => p.id === e.target.value)
              setProductId(e.target.value)
              setSelectedUnit(product?.unit || '')
            }}
          />

          {selectedProd && (
            <div className="p-3 bg-blue-50/60 rounded-lg text-xs text-blue-900 flex justify-between">
              <span>{t('adjustments.currentQty')}: <b>{formatStockQuantity(selectedProd.physicalStock, selectedProd.unit, selectedProd.altUnit, selectedProd.conversionRate, t)}</b></span>
              <span>
                {t('adjustments.resultingQty')}:{' '}
                <b>{formatStockQuantity(Math.max(0, selectedProd.physicalStock + requestedChangeInStockUnits), selectedProd.unit, selectedProd.altUnit, selectedProd.conversionRate, t)}</b>
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('adjustments.requestedChange')}
              type="number"
              required
              placeholder="e.g. -2 for damage, or +5 for found stock"
              value={requestedChange}
              onChange={(e) => setRequestedChange(e.target.value)}
            />
            <Select
              label={t('stockIn.unitSelection')}
              required
              options={unitOptions}
              value={currentUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            />
          </div>
          {hasConversion && (
            <p className="text-[11px] text-zinc-500">
              {t('adjustments.requestedChange')}: {requestedChange} {formatUnitLabel(currentUnit, t)} = {requestedChangeInStockUnits} {formatUnitLabel(minorUnit, t)}
            </p>
          )}

          <Input
            label={t('products.description')}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

