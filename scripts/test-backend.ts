import { initializeSheets, getAllRows, SHEETS } from '../backend/sheets'
import { getProducts } from '../backend/services/products.service'
import { recordStockIn, recordStockOut } from '../backend/services/inventory.service'
import { registerCustomerLeftover, recordCustomerCollection, getCustomerRecords } from '../backend/services/leftovers.service'
import { getDashboardMetrics } from '../backend/services/dashboard.service'
import { generateCsvReport } from '../backend/services/reports.service'
import bcrypt from 'bcryptjs'
import assert from 'assert'

async function run() {
  console.log('--- Testing Backend Engine (Zero-Cost Google Sheets / Storage Architecture) ---')

  // 1. Initialize
  await initializeSheets()
  console.log('✔ Sheet initialization successful')

  // 2. Seed Admin & Staff if empty
  const users = await getAllRows(SHEETS.Users)
  let adminId = 'admin_test'
  if (users.length === 0) {
    const adminPass = await bcrypt.hash('AdminPassword123!', 10)
    const { appendRow } = await import('../backend/sheets')
    await appendRow(SHEETS.Users, [
      adminId,
      'System Admin (អ្នកគ្រប់គ្រង)',
      'admin@karaokestock.com',
      adminPass,
      'ADMIN',
      'km',
      'western',
      'true',
      new Date().toISOString(),
      new Date().toISOString(),
    ])
    console.log('✔ Initial admin created')
  } else {
    adminId = users[0].id
    console.log('✔ Existing user verified:', users[0].email)
  }

  // 3. Populate Categories & Products if empty
  const prods = await getAllRows(SHEETS.Products)
  if (prods.length === 0) {
    const { appendRow } = await import('../backend/sheets')
    const now = new Date().toISOString()
    await appendRow(SHEETS.Categories, ['cat_beer', 'Beer & Cider', 'ស្រាបៀរ និងស៊ីដឺ', 'Cold beers', 'true', now, now])
    await appendRow(SHEETS.Products, [
      'prod_angkor',
      'BEER-ANG-CAN',
      'Angkor Beer Can 330ml',
      'ស្រាបៀរអង្គរ កំប៉ុង ៣៣០មល',
      'cat_beer',
      'Angkor',
      'can',
      '0.65',
      '1.50',
      '100', // physicalStock
      '0',   // reservedStock
      '20',  // minStock
      '',
      'Fresh beer',
      '',
      'true',
      now,
      now,
    ])
    console.log('✔ Initial products seeded')
  }

  // 4. Test Products Query
  const { products } = await getProducts()
  assert(products.length > 0, 'Should have at least 1 product')
  const angkor = products.find((p) => p.sku === 'BEER-ANG-CAN')!
  console.log(`✔ Found product: ${angkor.name} | Available: ${angkor.availableStock}`)

  // 5. Test Customer Leftovers Registration & Reservation
  const initialAvailable = angkor.availableStock
  const qtyToHold = 12

  const { record, items } = await registerCustomerLeftover({
    customerName: 'Sophea Kim (គីម សុភា)',
    customerPhone: '០១២ ៩៩៩ ៨៨៨', // Khmer numerals input
    storageLocation: 'Locker #5 (ទូលេខ ៥)',
    notes: 'Karaoke room guest left unopened beer',
    items: [{ productId: angkor.id, quantity: qtyToHold, unit: 'can' }],
    userId: adminId,
    userName: 'Admin',
  })

  console.log(`✔ Registered customer leftover: ${record.recordNumber} for ${record.customerName}`)
  assert.strictEqual(record.status, 'HELD')

  // Verify reservation math: available stock MUST decrease by reserved quantity!
  const { products: updatedProds } = await getProducts()
  const updatedAngkor = updatedProds.find((p) => p.id === angkor.id)!
  assert.strictEqual(
    updatedAngkor.availableStock,
    initialAvailable - qtyToHold,
    'Available stock must equal physicalStock - reservedStock'
  )
  console.log(`✔ Stock Reservation Math Verified: Available reduced from ${initialAvailable} to ${updatedAngkor.availableStock}`)

  // 6. Test Partial Collection
  const collectQty = 6
  const { record: collectedRecord } = await recordCustomerCollection({
    recordId: record.id,
    collections: [{ itemId: items[0].id, quantity: collectQty }],
    notes: 'Collected 6 cans',
    userId: adminId,
    userName: 'Admin',
  })

  assert.strictEqual(collectedRecord.status, 'PARTIALLY_COLLECTED')
  console.log(`✔ Partial Collection Verified: Status is ${collectedRecord.status}`)

  // Verify stock reservation released
  const { products: afterCollectProds } = await getProducts()
  const afterCollectAngkor = afterCollectProds.find((p) => p.id === angkor.id)!
  assert.strictEqual(
    afterCollectAngkor.availableStock,
    initialAvailable - (qtyToHold - collectQty),
    'Reservation release must increase available stock'
  )
  console.log(`✔ Reservation Release Verified: Available is now ${afterCollectAngkor.availableStock}`)

  // 7. Test Dashboard Metrics
  const metrics = await getDashboardMetrics()
  assert(metrics.totalProducts > 0, 'Total products should be > 0')
  assert(metrics.stockMovementChart.length === 7, 'Last 7 days chart data should exist')
  console.log(`✔ Dashboard Metrics: Total Products=${metrics.totalProducts}, Available Units=${metrics.totalAvailableStock}, Leftovers=${metrics.outstandingLeftovers}`)

  // 8. Test CSV Export with UTF-8 BOM
  const csv = await generateCsvReport({ type: 'stock', language: 'km' })
  assert(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel')
  assert(csv.includes('ស្រាបៀរ'), 'CSV should contain Khmer text properly without corruption')
  console.log('✔ CSV Export with UTF-8 BOM Verified')

  console.log('--- ALL BACKEND ARCHITECTURE & BUSINESS RULES VERIFIED SUCCESSFULLY ---')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})

