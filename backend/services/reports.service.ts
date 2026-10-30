import { getAllRows, SHEETS } from '@/backend/sheets'
import { getStockLedger } from '@/backend/services/inventory.service'
import { getProducts } from '@/backend/services/products.service'
import { getCustomerRecords } from '@/backend/services/leftovers.service'

export async function getReportData(params: {
  type: 'stock' | 'movements' | 'purchases' | 'leftovers' | 'staff'
  startDate?: string
  endDate?: string
  categoryId?: string
  supplierId?: string
}): Promise<any[]> {
  const { type, startDate, endDate, categoryId, supplierId } = params

  if (type === 'stock') {
    const { products } = await getProducts({ categoryId, limit: 1000 })
    return products.map((p) => ({
      name: p.name,
      nameKm: p.nameKm,
      category: p.categoryName,
      unit: p.unit,
      altUnit: p.altUnit || '',
      conversionRate: p.conversionRate || 1,
      physicalStock: p.physicalStock,
      reservedStock: p.reservedStock,
      availableStock: p.availableStock,
      purchaseUnit: p.altUnit || p.unit,
      purchaseCost: Number(p.purchaseCost) || 0,
      costPerUnit: Number(((Number(p.purchaseCost) || 0) / (Number(p.conversionRate) > 1 ? Number(p.conversionRate) : 1)).toFixed(4)),
      inventoryValue: Number((p.physicalStock * ((Number(p.purchaseCost) || 0) / (Number(p.conversionRate) > 1 ? Number(p.conversionRate) : 1))).toFixed(2)),
      status: p.availableStock <= 0 ? 'Out of Stock' : p.availableStock <= p.minStock ? 'Low Stock' : 'In Stock',
    }))
  }

  if (type === 'movements') {
    const movements = await getStockLedger({ startDate, endDate, limit: 1000 })
    return movements.map((m) => ({
      date: m.createdAt.slice(0, 16).replace('T', ' '),
      product: m.productName,
      type: m.type,
      quantity: m.enteredQuantity ?? m.quantity,
      unit: m.enteredUnit || m.productMainUnit || '',
      previousBalance: m.previousBalance,
      resultingBalance: m.resultingBalance,
      reference: m.reference || '—',
      reason: m.reason || '—',
      recordedBy: m.recordedByName || 'Staff',
    }))
  }

  if (type === 'purchases') {
    const [purRows, prodRows, supRows] = await Promise.all([
      getAllRows(SHEETS.PurchaseRecords),
      getAllRows(SHEETS.Products),
      getAllRows(SHEETS.Suppliers),
    ])
    const prodMap = new Map(prodRows.map((p) => [p.id, p]))
    const supMap = new Map(supRows.map((s) => [s.id, s.name]))

    let list = purRows.map((p) => {
      const prod = prodMap.get(p.productId)
      return {
        date: (p.purchaseDate || p.createdAt).slice(0, 10),
        product: prod?.name || 'Product',
        supplier: supMap.get(p.supplierId) || 'Supplier',
        quantity: Number(p.quantity) || 0,
        unitCost: Number(p.unitCost) || 0,
        totalAmount: Number(p.totalAmount) || 0,
        currency: p.currency || 'USD',
        invoiceNumber: p.invoiceNumber || '—',
      }
    })

    if (supplierId && supplierId !== 'ALL') {
      list = list.filter((p) => p.supplier === supplierId)
    }
    return list
  }

  if (type === 'leftovers') {
    const { records } = await getCustomerRecords({ limit: 1000 })
    return records.map((r) => ({
      receiptNumber: r.recordNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      status: r.status,
      storageLocation: r.storageLocation || 'Main Storage',
      itemsCount: r.itemCount,
      totalRemainingQty: r.totalRemainingQty,
      storedDate: r.createdAt.slice(0, 10),
      recordedBy: r.recordedByName || 'Staff',
    }))
  }

  if (type === 'staff') {
    const logs = await getAllRows(SHEETS.AuditLogs)
    return logs.map((l) => ({
      timestamp: l.createdAt.slice(0, 16).replace('T', ' '),
      staff: l.actorName || 'Staff',
      action: l.action,
      entity: l.entityType,
      details: l.details || '',
    }))
  }

  return []
}

/**
 * Exports tabular report to CSV with UTF-8 BOM (\uFEFF)
 * so Excel opens Khmer characters cleanly.
 */
export async function generateCsvReport(params: {
  type: 'stock' | 'movements' | 'purchases' | 'leftovers' | 'staff'
  language: 'km' | 'en'
  startDate?: string
  endDate?: string
  categoryId?: string
  supplierId?: string
}): Promise<string> {
  const data = await getReportData(params)
  if (!data || data.length === 0) {
    return '\uFEFFNo data\n'
  }

  const isKm = params.language === 'km'
  const keys = Object.keys(data[0])

  // Localized column header translation map
  const HEADER_MAP: Record<string, { en: string; km: string }> = {
    sku: { en: 'SKU', km: 'កូដទំនិញ' },
    name: { en: 'Product Name', km: 'ឈ្មោះផលិតផល' },
    nameKm: { en: 'Khmer Name', km: 'ឈ្មោះខ្មែរ' },
    category: { en: 'Category', km: 'ប្រភេទ' },
    unit: { en: 'Unit', km: 'ឯកតា' },
    purchaseUnit: { en: 'Purchase Unit', km: 'ឯកតាយកចូល' },
    costPerUnit: { en: 'Cost per Item', km: 'តម្លៃក្នុងមួយឯកតា' },
    physicalStock: { en: 'Physical Stock', km: 'ស្តុកជាក់ស្តែង' },
    reservedStock: { en: 'Reserved Stock', km: 'ស្តុកភ្ញៀវផ្ញើ' },
    availableStock: { en: 'Available Stock', km: 'ស្តុកអាចលក់' },
    purchaseCost: { en: 'Purchase Cost ($)', km: 'តម្លៃយកចូល ($)' },
    inventoryValue: { en: 'Total Value ($)', km: 'តម្លៃសរុប ($)' },
    status: { en: 'Status', km: 'ស្ថានភាព' },
    date: { en: 'Date', km: 'កាលបរិច្ឆេទ' },
    product: { en: 'Product', km: 'មុខទំនិញ' },
    type: { en: 'Type', km: 'ប្រភេទចលនា' },
    quantity: { en: 'Quantity', km: 'បរិមាណ' },
    previousBalance: { en: 'Prev Balance', km: 'សមតុល្យមុន' },
    resultingBalance: { en: 'Result Balance', km: 'សមតុល្យក្រោយ' },
    reference: { en: 'Reference', km: 'លេខសំអាង' },
    reason: { en: 'Reason', km: 'មូលហេតុ' },
    recordedBy: { en: 'Recorded By', km: 'កត់ត្រាដោយ' },
    supplier: { en: 'Supplier', km: 'អ្នកផ្គត់ផ្គង់' },
    unitCost: { en: 'Unit Cost', km: 'ថ្លៃដើមមួយឯកតា' },
    totalAmount: { en: 'Total Amount', km: 'ទឹកប្រាក់សរុប' },
    currency: { en: 'Currency', km: 'រូបិយប័ណ្ណ' },
    invoiceNumber: { en: 'Invoice #', km: 'លេខវិក្កយបត្រ' },
    receiptNumber: { en: 'Receipt #', km: 'លេខបង្កាន់ដៃ' },
    customerName: { en: 'Customer Name', km: 'ឈ្មោះភ្ញៀវ' },
    customerPhone: { en: 'Phone Number', km: 'លេខទូរស័ព្ទ' },
    storageLocation: { en: 'Storage Location', km: 'ទីតាំងទុក' },
    itemsCount: { en: 'Items Count', km: 'ចំនួនមុខទំនិញ' },
    totalRemainingQty: { en: 'Remaining Qty', km: 'ចំនួននៅសល់' },
    storedDate: { en: 'Stored Date', km: 'កាលបរិច្ឆេទផ្ញើ' },
    timestamp: { en: 'Timestamp', km: 'ពេលវេលា' },
    staff: { en: 'Staff Member', km: 'បុគ្គលិក' },
    action: { en: 'Action', km: 'សកម្មភាព' },
    entity: { en: 'Entity', km: 'កំណត់ត្រា' },
    details: { en: 'Details', km: 'ព័ត៌មានលម្អិត' },
  }

  const escapeCell = (val: any) => {
    const s = String(val ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const headers = keys.map((k) => {
    const mapped = HEADER_MAP[k]
    return escapeCell(mapped ? (isKm ? mapped.km : mapped.en) : k)
  })

  const rows = data.map((row) => keys.map((k) => escapeCell(row[k])).join(','))

  // UTF-8 BOM + Header + Rows
  return '\uFEFF' + [headers.join(','), ...rows].join('\n')
}

