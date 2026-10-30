'use client'

import React from 'react'
import { CustomerRecordWithItems } from '@/backend/types'
import { formatPhoneNumber } from '@/backend/phone'
import { useI18n } from '@/lib/i18n-context'
import { formatUnitLabel } from '@/lib/unit-labels'
import { Printer } from 'lucide-react'
import { Button } from '@/frontend/components/ui/Button'

interface CustomerReceiptProps {
  record: CustomerRecordWithItems
}

export function CustomerReceipt({ record }: CustomerReceiptProps) {
  const { t, formatDate } = useI18n()

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex justify-end mb-4 no-print">
        <Button onClick={handlePrint} variant="primary" size="sm">
          <Printer className="w-4 h-4" />
          <span>Print Receipt / បោះពុម្ព</span>
        </Button>
      </div>

      <div className="printable-receipt w-full max-w-sm bg-white p-6 border border-gray-200 rounded-xl shadow-sm text-xs font-mono text-gray-800">
        {/* Header */}
        <div className="text-center pb-3 border-b border-dashed border-gray-300">
          <h2 className="text-sm font-bold tracking-wider text-black">KARAOKE & LOUNGE</h2>
          <p className="text-[11px] font-semibold text-gray-600 mt-0.5">បង្កាន់ដៃផ្ញើទំនិញ / CUSTOMER LEFTOVER</p>
          <p className="text-[10px] text-gray-500 mt-1">Phnom Penh, Cambodia</p>
        </div>

        {/* Info */}
        <div className="py-3 border-b border-dashed border-gray-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Receipt / លេខបង្កាន់ដៃ:</span>
            <span className="font-bold text-black">{record.recordNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date / កាលបរិច្ឆេទ:</span>
            <span>{formatDate(record.createdAt, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Customer / ភ្ញៀវ:</span>
            <span className="font-semibold text-black">{record.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone / ទូរស័ព្ទ:</span>
            <span>{formatPhoneNumber(record.customerPhone)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Storage / ទីតាំងទុក:</span>
            <span>{record.storageLocation || 'Main Bar Locker'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Received By / បុគ្គលិក:</span>
            <span>{record.recordedByName || 'Staff'}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-3 border-b border-dashed border-gray-300">
          <div className="flex justify-between font-bold text-gray-600 mb-2 border-b pb-1">
            <span>Item / មុខទំនិញ</span>
            <span>Qty / ចំនួន</span>
          </div>
          <div className="space-y-1.5">
            {record.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="pr-2">{item.productName}</span>
                <span className="font-bold whitespace-nowrap">
                  {item.originalQuantity} {formatUnitLabel(item.unit, t)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {record.notes && (
          <div className="py-2 border-b border-dashed border-gray-300 text-[10px] text-gray-600">
            <span className="font-semibold">Notes / ចំណាំ:</span> {record.notes}
          </div>
        )}

        {/* Terms */}
        <div className="py-3 border-b border-dashed border-gray-300 text-[10px] text-gray-500 space-y-1 text-center">
          <p>សូមបង្ហាញបង្កាន់ដៃនេះ ឬផ្ទៀងផ្ទាត់លេខទូរស័ព្ទពេលមកយកទំនិញ។</p>
          <p>Please present this receipt or verified phone number when collecting.</p>
          <p className="font-semibold text-gray-600">ទំនិញផ្ញើទុកបានរយៈពេលអតិបរមា ៣០ ថ្ងៃ (Items held max 30 days)</p>
        </div>

        {/* Signatures */}
        <div className="pt-6 pb-2 grid grid-cols-2 gap-4 text-center text-[10px]">
          <div>
            <div className="border-b border-gray-400 mb-1 h-8" />
            <span className="text-gray-600">Staff / បុគ្គលិក</span>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-1 h-8" />
            <span className="text-gray-600">Customer / ភ្ញៀវ</span>
          </div>
        </div>
      </div>
    </div>
  )
}

