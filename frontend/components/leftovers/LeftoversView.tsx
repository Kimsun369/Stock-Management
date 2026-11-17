'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Plus, Search, Clock, Printer, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { useToast } from '@/components/ui/toast'
import { formatUnitLabel } from '@/lib/unit-labels'
import { CustomerRecordWithItems } from '@/backend/types'
import { Button } from '@/frontend/components/ui/Button'
import { Select } from '@/frontend/components/ui/Select'
import { Badge } from '@/frontend/components/ui/Badge'
import { Modal } from '@/frontend/components/ui/Modal'
import { Input } from '@/frontend/components/ui/Input'
import { ScrollableTable } from '@/frontend/components/ui/ScrollableTable'
import { TableLoadingCard } from '@/frontend/components/ui/TableLoadingCard'
import { CustomerReceipt } from '@/frontend/components/customer-receipt'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function LeftoversView({ userRole = 'STAFF' }: { userRole?: 'ADMIN' | 'STAFF' }) {
  const { t, formatDate } = useI18n()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)

  // Collection modal
  const [collectRecord, setCollectRecord] = useState<CustomerRecordWithItems | null>(null)
  const [collectionQuantities, setCollectionQuantities] = useState<Record<string, number>>({})
  const [collectionNotes, setCollectionNotes] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [cancelRecord, setCancelRecord] = useState<{ id: string; customerName: string; recordNumber: string } | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)

  // Receipt modal
  const [receiptRecord, setReceiptRecord] = useState<CustomerRecordWithItems | null>(null)

  const apiUrl = `/api/leftovers?search=${encodeURIComponent(search)}&status=${status}&page=${page}&limit=20`
  const { data, isLoading, mutate } = useSWR(apiUrl, fetcher)

  const handleOpenCollect = async (record: CustomerRecordWithItems) => {
    // Fetch full details
    try {
      const res = await fetch(`/api/leftovers/${record.id}`)
      const full = await res.json()
      setCollectRecord(full)
      const initialQtys: Record<string, number> = {}
      full.items.forEach((it: any) => {
        initialQtys[it.id] = it.remainingQuantity
      })
      setCollectionQuantities(initialQtys)
      setCollectionNotes('')
      setCollectionError(null)
    } catch {
      alert('Error loading record')
    }
  }

  const handleOpenReceipt = async (record: CustomerRecordWithItems) => {
    try {
      const res = await fetch(`/api/leftovers/${record.id}`)
      const full = await res.json()
      setReceiptRecord(full)
    } catch {
      alert('Error loading record for receipt')
    }
  }

  const handleConfirmCollect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectRecord) return
    setIsCollecting(true)
    setCollectionError(null)

    const payload = {
      collections: Object.entries(collectionQuantities).map(([itemId, qty]) => ({
        itemId,
        quantity: Number(qty) || 0,
      })),
      notes: collectionNotes,
    }

    try {
      const res = await fetch(`/api/leftovers/${collectRecord.id}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to record collection')

      showToast(t('common.success'), 'success')
      setCollectRecord(null)
      mutate()
    } catch (err: any) {
      const msg = err.message === 'QUANTITY_EXCEEDS_OUTSTANDING'
        ? t('errors.QUANTITY_EXCEEDS_OUTSTANDING')
        : err.message
      setCollectionError(msg)
      showToast(msg, 'error')
    } finally {
      setIsCollecting(false)
    }
  }

  const handleConfirmCancel = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!cancelRecord) return
    setCancellingId(cancelRecord.id)
    setCancelError(null)

    try {
      const res = await fetch(`/api/leftovers/${cancelRecord.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to cancel')
      }
      showToast(t('common.success'), 'success')
      setCancelRecord(null)
      setCancelReason('')
      mutate()
    } catch (err: any) {
      const message = err.message || 'Error cancelling leftover'
      setCancelError(message)
      showToast(message, 'error')
    } finally {
      setCancellingId(null)
    }
  }

  const statusOptions = [
    { value: 'ALL', label: t('common.all') },
    { value: 'HELD', label: t('customerLeftovers.statuses.HELD') },
    { value: 'PARTIALLY_COLLECTED', label: t('customerLeftovers.statuses.PARTIALLY_COLLECTED') },
    { value: 'FULLY_COLLECTED', label: t('customerLeftovers.statuses.FULLY_COLLECTED') },
    { value: 'CANCELLED', label: t('customerLeftovers.statuses.CANCELLED') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('customerLeftovers.title')}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('customerLeftovers.subtitle')}</p>
        </div>
        <Link href="/dashboard/customer-leftovers/new" className="w-full sm:w-auto">
          <Button variant="primary" size="sm" className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            <span>{t('customerLeftovers.registerNew')}</span>
          </Button>
        </Link>
      </div>

      {/* Held Notice */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
        <span>{t('customerLeftovers.heldNotice')}</span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121216] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder={t('customerLeftovers.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="w-full md:w-56">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Table */}
      <ScrollableTable stickyActions={userRole === 'ADMIN'}>
        <table className="w-full text-left text-xs min-w-[1050px]">
          <thead className="bg-[#F8FAFC] dark:bg-[#18181D] text-gray-500 dark:text-zinc-400 font-semibold border-b">
            <tr>
              <th className="whitespace-nowrap px-5 py-3">{t('customerLeftovers.receiptNumber')}</th>
              <th className="whitespace-nowrap px-4 py-3 min-w-[160px]">{t('customerLeftovers.customerName')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('customerLeftovers.customerPhone')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('customerLeftovers.storageLocation')}</th>
              <th className="whitespace-nowrap px-3 py-3 text-center">{t('customerLeftovers.remainingQty')}</th>
              <th className="whitespace-nowrap px-3 py-3">{t('common.status')}</th>
              <th className="whitespace-nowrap px-4 py-3">{t('common.date')}</th>
              <th className="sticky right-0 z-20 whitespace-nowrap px-4 py-3 text-right bg-[#F8FAFC] dark:bg-[#18181D]">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-5 sm:p-8">
                  <TableLoadingCard />
                </td>
              </tr>
            ) : (data?.records || []).length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              data.records.map((r: CustomerRecordWithItems) => (
                <tr key={r.id} className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="whitespace-nowrap px-5 py-3 font-mono font-semibold text-blue-600">{r.recordNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900 dark:text-zinc-100">{r.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600 dark:text-zinc-300">{r.phoneDisplay}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-zinc-400">{r.storageLocation || 'Main Storage'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-center font-bold text-gray-800 dark:text-zinc-200">
                    <div className="flex flex-col items-center gap-0.5">
                      {r.items.filter((item) => item.remainingQuantity > 0).map((item) => (
                        <span key={item.id} className="whitespace-nowrap">
                          {item.remainingQuantity} {formatUnitLabel(item.unit, t)}
                        </span>
                      ))}
                      {!r.items.some((item) => item.remainingQuantity > 0) && <span>0</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge
                      variant={
                        r.status === 'HELD'
                          ? 'warning'
                          : r.status === 'PARTIALLY_COLLECTED'
                          ? 'info'
                          : r.status === 'FULLY_COLLECTED'
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {t(`customerLeftovers.statuses.${r.status}`)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-400">{formatDate(r.createdAt)}</td>
                  <td className="sticky right-0 z-10 whitespace-nowrap px-4 py-3 text-right space-x-2 bg-white dark:bg-[#121216] group-hover:bg-zinc-50/90 dark:group-hover:bg-[#191920]">
                    <button
                      onClick={() => handleOpenReceipt(r)}
                      className="p-1 rounded text-gray-500 dark:text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                      title={t('customerLeftovers.printReceipt')}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {(r.status === 'HELD' || r.status === 'PARTIALLY_COLLECTED') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenCollect(r)}
                        className="text-[16.5px] py-1 px-2.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t('customerLeftovers.collectNow')}</span>
                      </Button>
                    )}

                    {userRole === 'ADMIN' && r.status !== 'CANCELLED' && r.status !== 'FULLY_COLLECTED' && (
                      <button
                        onClick={() => {
                          setCancelRecord({ id: r.id, customerName: r.customerName, recordNumber: r.recordNumber })
                          setCancelReason('')
                          setCancelError(null)
                        }}
                        disabled={cancellingId === r.id}
                        className="p-1 rounded text-gray-400 hover:text-red-600 disabled:opacity-50"
                        title={t('customerLeftovers.cancelRecord')}
                      >
                        {cancellingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500 inline-block" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollableTable>

      {/* Collect Items Modal */}
      {collectRecord && (
        <Modal
          isOpen={true}
          onClose={() => setCollectRecord(null)}
          title={`${t('customerLeftovers.collectNow')} - ${collectRecord.customerName} (${collectRecord.recordNumber})`}
        >
          <form onSubmit={handleConfirmCollect} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200">
              {t('customerLeftovers.verifyIdentity')}
            </div>

            {collectionError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
                {collectionError}
              </div>
            )}

            <div className="space-y-3">
              {collectRecord.items.map((it) => (
                <div key={it.id} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-zinc-100 text-xs">{it.productName}</p>
                    <p className="text-[15px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {t('customerLeftovers.originalQty')}: {it.originalQuantity} | {t('customerLeftovers.remainingQty')}:{' '}
                      <b>{it.remainingQuantity} {formatUnitLabel(it.unit, t)}</b>
                    </p>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min="0"
                      max={it.remainingQuantity}
                      value={collectionQuantities[it.id] ?? 0}
                      onChange={(e) =>
                        setCollectionQuantities({
                          ...collectionQuantities,
                          [it.id]: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <Input
              label={t('common.notes')}
              placeholder="Collection notes / កំណត់ចំណាំប្រគល់"
              value={collectionNotes}
              onChange={(e) => setCollectionNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setCollectRecord(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isCollecting}>
                {t('customerLeftovers.collectNow')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {cancelRecord && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (cancellingId !== cancelRecord.id) setCancelRecord(null)
          }}
          title={t('customerLeftovers.cancelTitle')}
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              <p className="font-semibold">{cancelRecord.customerName} · {cancelRecord.recordNumber}</p>
              <p className="mt-1 text-xs">{t('customerLeftovers.cancelMessage')}</p>
            </div>

            {cancelError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {cancelError}
              </div>
            )}

            <div>
              <label htmlFor="leftover-cancel-reason" className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {t('customerLeftovers.cancelReason')} <span className="font-normal text-zinc-500">({t('customerLeftovers.optional')})</span>
              </label>
              <textarea
                id="leftover-cancel-reason"
                autoFocus
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={t('customerLeftovers.cancelReasonPlaceholder')}
                disabled={cancellingId === cancelRecord.id}
                className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 dark:border-zinc-700 dark:bg-[#18181D] dark:text-zinc-100"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cancellingId === cancelRecord.id}
                onClick={() => setCancelRecord(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="danger" size="sm" isLoading={cancellingId === cancelRecord.id}>
                {t('customerLeftovers.cancelConfirm')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bilingual Receipt Modal */}
      {receiptRecord && (
        <Modal
          isOpen={true}
          onClose={() => setReceiptRecord(null)}
          title={t('customerLeftovers.printReceipt')}
        >
          <CustomerReceipt record={receiptRecord} />
        </Modal>
      )}
    </div>
  )
}

