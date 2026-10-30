'use client'

import { Modal } from '@/frontend/components/ui/Modal'
import { formatStockQuantity, formatUnitLabel } from '@/lib/unit-labels'

export function TransactionDetail({ item, onClose, language, t, formatDate }: {
  item: any
  onClose: () => void
  language: string
  t: (key: string) => string
  formatDate: (value: string) => string
}) {
  if (!item) return null
  const title = language === 'km' && item.productNameKm ? item.productNameKm : item.productName
  const quantity = item.enteredUnit
    ? `${item.enteredQuantity} ${formatUnitLabel(item.enteredUnit, t)}`
    : formatStockQuantity(item.quantity, item.productMainUnit, item.productMinorUnit, item.productConversionRate, t)
  return (
    <Modal isOpen={Boolean(item)} onClose={onClose} title={title || t('dashboard.recentTransactions')}>
      <dl className="space-y-4 text-sm">
        <div><dt className="text-xs text-zinc-500">{t('common.quantity')}</dt><dd className="font-semibold">{quantity}</dd></div>
        <div><dt className="text-xs text-zinc-500">{t('products.description')}</dt><dd className="font-medium whitespace-pre-wrap">{item.reason || item.notes || '—'}</dd></div>
        {item.reason && item.notes && item.reason !== item.notes && <div><dt className="text-xs text-zinc-500">{t('common.notes')}</dt><dd className="whitespace-pre-wrap">{item.notes}</dd></div>}
        {item.reference && <div><dt className="text-xs text-zinc-500">{t('stockOut.reference')}</dt><dd>{item.reference}</dd></div>}
        <div><dt className="text-xs text-zinc-500">{t('common.date')}</dt><dd>{formatDate(item.createdAt)}</dd></div>
        {item.recordedByName && <div><dt className="text-xs text-zinc-500">{t('reports.columns.recordedBy')}</dt><dd>{item.recordedByName}</dd></div>}
      </dl>
    </Modal>
  )
}
