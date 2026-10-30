import { initializeSheets, getAllRows, SHEETS } from '../backend/sheets'
import { createCategory, updateCategory, getCategories } from '../backend/services/categories.service'
import { createProduct, getProducts, getProductById } from '../backend/services/products.service'
import { recordStockIn, recordStockOut } from '../backend/services/inventory.service'
import { registerCustomerLeftover, recordCustomerCollection } from '../backend/services/leftovers.service'
import { getDashboardMetrics } from '../backend/services/dashboard.service'
import assert from 'assert'

async function run() {
  console.log('=== SYSTEM IMPROVEMENTS & REQUIRED WORKFLOW TEST ===\n')

  // 1. Initialize sheets with updated headers
  console.log('Step 1: Initializing Google Sheets / Backend storage...')
  await initializeSheets()
  console.log('✔ Google Sheets initialized successfully with updated headers\n')

  const adminId = 'admin_tester'
  const adminName = 'Admin Tester'
  const staffId = 'staff_tester'
  const staffName = 'Staff Member'

  // 2. Admin manages agreed pricing configuration in Category Management
  console.log('Step 2: Admin configures category with agreed purchase price...')
  const testCatName = `Test Beer Cat ${Date.now()}`
  const cat = await createCategory(
    {
      name: testCatName,
      nameKm: 'ប្រភេទស្រាបៀរសាកល្បង',
      description: 'Beer category with agreed price',
      agreedPurchasePrice: 0.65,
    },
    adminId,
    adminName
  )
  assert.strictEqual(cat.agreedPurchasePrice, 0.65, 'Category agreed purchase price should be 0.65')
  console.log(`✔ Created category "${cat.name}" with agreed purchase price: $${cat.agreedPurchasePrice}`)

  // Update agreed pricing
  const updatedCat = await updateCategory(
    cat.id,
    { agreedPurchasePrice: 0.70 },
    adminId,
    adminName
  )
  assert.strictEqual(updatedCat.agreedPurchasePrice, 0.70, 'Agreed purchase price should update to 0.70')
  console.log(`✔ Admin updated category agreed purchase price to: $${updatedCat.agreedPurchasePrice}\n`)

  // 3. Create a product with Main unit: Can, Alt unit: Box, Conversion: 1 Box = 24 Cans
  console.log('Step 3: Creating product with Can & Box units (1 Box = 24 Cans)...')
  const testSku = `BEER-BOX-${Date.now()}`
  const product = await createProduct(
    {
      sku: testSku,
      name: 'Cambodia Beer Can 330ml',
      nameKm: 'ស្រាបៀរកម្ពុជា កំប៉ុង',
      categoryId: cat.id,
      brand: 'Cambodia',
      unit: 'can',
      altUnit: 'box',
      conversionRate: 24,
      purchaseCost: 0.70, // Agreed price from category
      sellingPrice: 1.50,
      minStock: 24,
    },
    adminId,
    adminName
  )

  assert.strictEqual(product.unit, 'can')
  assert.strictEqual(product.altUnit, 'box')
  assert.strictEqual(product.conversionRate, 24)
  assert.strictEqual(product.physicalStock, 0)
  assert.strictEqual(product.purchaseCost, 0.70)
  console.log(`✔ Product created: ${product.name} (${product.sku})`)
  console.log(`  - Main Unit: ${product.unit}`)
  console.log(`  - Packaging Unit: ${product.altUnit}`)
  console.log(`  - Conversion Rate: 1 ${product.altUnit} = ${product.conversionRate} ${product.unit}s`)
  console.log(`  - Initial Physical Stock: ${product.physicalStock} ${product.unit}s\n`)

  // 4. Add 2 Boxes and verify stock increases by 48 Cans
  console.log('Step 4: Recording Stock In (Add Stock) of 2 Boxes...')
  // Staff attempts to record 2 Boxes and pass unitCost=999 (tampering test)
  const stockInResult = await recordStockIn({
    productId: product.id,
    quantity: 2,
    unit: 'box',
    unitCost: 999, // Should be IGNORED! Staff cannot change configured price!
    invoiceNumber: 'INV-TEST-001',
    notes: 'Received 2 boxes from distributor',
    userId: staffId,
    userName: staffName,
  })

  const prodAfterIn = await getProductById(product.id)
  assert(prodAfterIn, 'Product must exist')

  console.log(`✔ Stock In recorded:`)
  console.log(`  - Quantity Added: 2 Boxes × 24 Cans = ${stockInResult.transaction.quantity} Cans`)
  console.log(`  - Physical Stock updated: 0 -> ${prodAfterIn.physicalStock} Cans`)
  console.log(`  - Available Stock: ${prodAfterIn.availableStock} Cans`)
  assert.strictEqual(prodAfterIn.physicalStock, 48, 'Stock must increase by exactly 48 Cans (2 Boxes × 24)')
  assert.strictEqual(prodAfterIn.availableStock, 48, 'Available stock must increase by exactly 48 Cans')

  // Verify staff CANNOT change purchase price
  assert.strictEqual(prodAfterIn.purchaseCost, 0.70, 'Purchase price must remain $0.70 (tampered unitCost ignored)')
  console.log(`✔ Staff cannot change purchase price verified: price remains configured $${prodAfterIn.purchaseCost}\n`)

  // 5. Remove 1 Box and verify stock decreases by 24 Cans
  console.log('Step 5: Recording Stock Out (Remove Stock) of 1 Box...')
  const stockOutResult = await recordStockOut({
    productId: product.id,
    quantity: 1,
    unit: 'box',
    reason: 'Room Service Room 202',
    reference: 'Room 202',
    notes: 'Dispensed 1 box to room',
    userId: staffId,
    userName: staffName,
  })

  const prodAfterOut = await getProductById(product.id)
  assert(prodAfterOut, 'Product must exist')

  console.log(`✔ Stock Out recorded:`)
  console.log(`  - Quantity Deducted: 1 Box × 24 Cans = ${stockOutResult.transaction.quantity} Cans`)
  console.log(`  - Physical Stock updated: 48 -> ${prodAfterOut.physicalStock} Cans`)
  console.log(`  - Available Stock: ${prodAfterOut.availableStock} Cans`)
  assert.strictEqual(prodAfterOut.physicalStock, 24, 'Stock must decrease by exactly 24 Cans (48 - 24 = 24)')
  assert.strictEqual(prodAfterOut.availableStock, 24, 'Available stock must be 24 Cans')
  assert.strictEqual(prodAfterOut.purchaseCost, 0.70, 'Stock Out must NOT change purchase price')
  console.log(`✔ Purchase price unchanged after Stock Out: $${prodAfterOut.purchaseCost}\n`)

  // 6. Test Customer-held units and Leftovers reservation
  console.log('Step 6: Testing Customer Leftovers & Reserved Units...')
  const initialAvailable = prodAfterOut.availableStock
  const leftover = await registerCustomerLeftover({
    customerName: 'Dara Chan',
    customerPhone: '098 765 432',
    storageLocation: 'Locker #12',
    notes: 'Leftover beer from Room 202',
    items: [{ productId: product.id, quantity: 6, unit: 'can' }],
    userId: staffId,
    userName: staffName,
  })

  const prodAfterLeftover = await getProductById(product.id)
  assert(prodAfterLeftover, 'Product must exist')
  console.log(`✔ Leftover registered for 6 cans:`)
  console.log(`  - Physical Stock: ${prodAfterLeftover.physicalStock}`)
  console.log(`  - Reserved Stock: ${prodAfterLeftover.reservedStock}`)
  console.log(`  - Available Stock: ${prodAfterLeftover.availableStock}`)
  assert.strictEqual(prodAfterLeftover.reservedStock, 6, 'Reserved stock must be 6 cans')
  assert.strictEqual(prodAfterLeftover.availableStock, initialAvailable - 6, 'Available stock must be reduced by 6 cans')

  // 7. Test Dashboard Metrics with Date Filters (today, thisWeek, thisMonth)
  console.log('\nStep 7: Testing Dashboard with Date Filters...')
  for (const filter of ['today', 'thisWeek', 'thisMonth'] as const) {
    const metrics = await getDashboardMetrics(filter)
    console.log(`✔ Dashboard Filter [${filter}]:`)
    console.log(`  - 1. Total Products: ${metrics.totalProducts}`)
    console.log(`  - 2. Available Stock: ${metrics.totalAvailableStock}`)
    console.log(`  - 3. Customer-Held Units: ${metrics.totalReservedStock}`)
    console.log(`  - 4. Low Stock Alerts: ${metrics.lowStockCount}`)
    console.log(`  - 5. Stock In (${filter}): ${metrics.periodStockIn}`)
    console.log(`  - 6. Stock Out (${filter}): ${metrics.periodStockOut}`)
    console.log(`  - 7. Spend (${filter}): $${metrics.periodPurchases}`)
    console.log(`  - 8. Customer Leftovers: ${metrics.outstandingLeftovers}`)

    assert(metrics.totalProducts >= 1, 'Total products should be at least 1')
    assert(metrics.totalAvailableStock >= 0, 'Available stock should be non-negative')
    assert(metrics.totalReservedStock >= 6, 'Reserved stock should include the 6 customer held cans')
    assert((metrics.periodStockIn ?? 0) >= 48, 'Stock In should include the 48 cans added')
    assert((metrics.periodStockOut ?? 0) >= 24, 'Stock Out should include the 24 cans removed')
    assert((metrics.periodPurchases ?? 0) > 0, 'Spend should be calculated from actual stock-in purchases')
  }

  // 8. Test 3 Charts Real Data
  console.log('\nStep 8: Verifying 3 Dashboard Charts...')
  const dashData = await getDashboardMetrics('thisMonth')

  // Chart 1: Stock In vs Stock Out (Last 7 Days)
  assert(dashData.stockMovementChart.length === 7, 'Chart 1 must have 7 days of data')
  const lastDayMove = dashData.stockMovementChart[6]
  console.log(`✔ Chart 1: Stock In vs Stock Out (Last 7 Days):`)
  console.log(`  - Data points: ${dashData.stockMovementChart.length} days`)
  console.log(`  - Today: Stock In = ${lastDayMove.stockIn}, Stock Out = ${lastDayMove.stockOut}`)
  assert(lastDayMove.stockIn >= 48, 'Today should have recorded >= 48 stock in')
  assert(lastDayMove.stockOut >= 24, 'Today should have recorded >= 24 stock out')

  // Chart 2: Purchase Spending Trend (Last 7 Days)
  assert(dashData.purchaseTrendChart.length === 7, 'Chart 2 must have 7 days of data')
  const lastDaySpend = dashData.purchaseTrendChart[6]
  console.log(`✔ Chart 2: Purchase Spending Trend (Last 7 Days):`)
  console.log(`  - Data points: ${dashData.purchaseTrendChart.length} days`)
  console.log(`  - Today Spend: $${lastDaySpend.spend}`)
  assert(lastDaySpend.spend > 0, 'Today spend should reflect actual purchases')

  // Chart 3: Stock by Category (Donut chart without zero-stock categories)
  console.log(`✔ Chart 3: Stock by Category (Donut Chart):`)
  console.log(`  - Active categories with stock: ${dashData.categoryStockChart.length}`)
  for (const catStat of dashData.categoryStockChart) {
    console.log(`    * ${catStat.name}: ${catStat.units} units (${catStat.percentage}%)`)
    assert(catStat.units > 0, 'Must NOT display categories with zero stock')
  }

  console.log('\n============================================================')
  console.log('🎉 ALL SYSTEM IMPROVEMENTS & WORKFLOW TESTS PASSED 100% 🎉')
  console.log('============================================================')
}

run().catch((err) => {
  console.error('\n❌ Workflow test failed:', err)
  process.exit(1)
})

