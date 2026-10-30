import { NextResponse } from 'next/server'
import { getAllRows, appendRow, updateRowById, initializeSheets, SHEETS, generateId, generateReceiptNumber } from '@/backend/sheets'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    await initializeSheets()

    // 1. Settings
    const defaultSettings = [
      ['defaultLanguage', 'km', new Date().toISOString()],
      ['defaultCurrency', 'USD', new Date().toISOString()],
      ['exchangeRateUsdKhr', '4100', new Date().toISOString()],
      ['numeralSystem', 'western', new Date().toISOString()],
      ['lowStockGlobalThreshold', '5', new Date().toISOString()],
    ]
    const existingSettings = await getAllRows(SHEETS.AppSettings)
    if (existingSettings.length === 0) {
      for (const s of defaultSettings) {
        await appendRow(SHEETS.AppSettings, s)
      }
    }

    // 2. Users
    const existingUsers = await getAllRows(SHEETS.Users)
    let adminId = ''
    let staffId = ''

    if (existingUsers.length === 0) {
      adminId = generateId()
      staffId = generateId()
      const adminPass = await bcrypt.hash('AdminPassword123!', 10)
      const staffPass = await bcrypt.hash('StaffPassword123!', 10)
      const now = new Date().toISOString()

      await appendRow(SHEETS.Users, [
        adminId,
        'System Administrator (អ្នកគ្រប់គ្រង)',
        'admin@karaokestock.com',
        adminPass,
        'ADMIN',
        'km',
        'western',
        'true',
        now,
        now,
      ])

      await appendRow(SHEETS.Users, [
        staffId,
        'Sokha Chan (ចាន់ សុខា)',
        'staff@karaokestock.com',
        staffPass,
        'STAFF',
        'km',
        'western',
        'true',
        now,
        now,
      ])
    } else {
      adminId = existingUsers[0].id
      staffId = existingUsers.length > 1 ? existingUsers[1].id : existingUsers[0].id
    }

    // 3. Categories
    const existingCats = await getAllRows(SHEETS.Categories)
    let beerCatId = 'cat_beer'
    let softCatId = 'cat_soft'
    let snackCatId = 'cat_snack'

    if (existingCats.length === 0) {
      const now = new Date().toISOString()
      await appendRow(SHEETS.Categories, [
        beerCatId,
        'Beer & Cider',
        'ស្រាបៀរ និងស៊ីដឺ',
        'Canned and bottled beers for karaoke rooms',
        'true',
        now,
        now,
      ])
      await appendRow(SHEETS.Categories, [
        softCatId,
        'Soft Drinks & Water',
        'ភេសជ្ជៈ និងទឹកបរិសុទ្ធ',
        'Carbonated drinks, mineral water, energy drinks',
        'true',
        now,
        now,
      ])
      await appendRow(SHEETS.Categories, [
        snackCatId,
        'Bar Snacks & Food Ingredients',
        'គ្រឿងក្លែម និងគ្រឿងផ្សំម្ហូប',
        'Karaoke finger food and snacks',
        'true',
        now,
        now,
      ])
    } else {
      beerCatId = existingCats[0].id
      softCatId = existingCats.length > 1 ? existingCats[1].id : existingCats[0].id
      snackCatId = existingCats.length > 2 ? existingCats[2].id : existingCats[0].id
    }

    // 4. Suppliers
    const existingSups = await getAllRows(SHEETS.Suppliers)
    let sup1Id = 'sup_angkor'
    let sup2Id = 'sup_khmerbev'

    if (existingSups.length === 0) {
      const now = new Date().toISOString()
      await appendRow(SHEETS.Suppliers, [
        sup1Id,
        'Angkor Brewery Distributor',
        'តំណាងចែកចាយស្រាបៀរអង្គរ',
        'Mr. Vanna (លោក វណ្ណា)',
        '012888999',
        'orders@angkorbrewery.com.kh',
        'National Road 5, Phnom Penh',
        'Official distributor',
        'true',
        now,
        now,
      ])
      await appendRow(SHEETS.Suppliers, [
        sup2Id,
        'Khmer Beverages Ltd',
        'ក្រុមហ៊ុន ខ្មែរ ប៊ែវើរីជីស',
        'Ms. Davy (កញ្ញា ដាវី)',
        '015777666',
        'sales@khmerbev.com.kh',
        'Hun Sen Blvd, Phnom Penh',
        'Official distributor',
        'true',
        now,
        now,
      ])
    }

    // 5. Products & initial stock movements
    const existingProds = await getAllRows(SHEETS.Products)
    let angkorProdId = ''

    if (existingProds.length === 0) {
      const now = new Date().toISOString()
      const seedProducts = [
        {
          id: 'prod_ang_can',
          sku: 'BEER-ANG-CAN',
          name: 'Angkor Beer Can 330ml',
          nameKm: 'ស្រាបៀរអង្គរ កំប៉ុង ៣៣០មល',
          categoryId: beerCatId,
          brand: 'Angkor',
          unit: 'can',
          altUnit: 'box',
          conversionRate: '24',
          cost: '0.65',
          price: '1.50',
          stock: '120',
          reserved: '12',
          min: '24',
          supId: sup1Id,
        },
        {
          id: 'prod_cam_can',
          sku: 'BEER-CAM-CAN',
          name: 'Cambodia Beer Can 330ml',
          nameKm: 'ស្រាបៀរកម្ពុជា កំប៉ុង ៣៣០មល',
          categoryId: beerCatId,
          brand: 'Cambodia',
          unit: 'can',
          altUnit: 'box',
          conversionRate: '24',
          cost: '0.60',
          price: '1.50',
          stock: '96',
          reserved: '0',
          min: '24',
          supId: sup2Id,
        },
        {
          id: 'prod_hein_can',
          sku: 'BEER-HEIN-CAN',
          name: 'Heineken Beer Can 330ml',
          nameKm: 'ស្រាបៀរហៃណឺកែន កំប៉ុង ៣៣០មល',
          categoryId: beerCatId,
          brand: 'Heineken',
          unit: 'can',
          altUnit: 'box',
          conversionRate: '24',
          cost: '1.10',
          price: '2.50',
          stock: '48',
          reserved: '0',
          min: '12',
          supId: sup1Id,
        },
        {
          id: 'prod_coke_can',
          sku: 'SFT-COKE-CAN',
          name: 'Coca-Cola Can 330ml',
          nameKm: 'កូកាកូឡា កំប៉ុង ៣៣០មល',
          categoryId: softCatId,
          brand: 'Coca-Cola',
          unit: 'can',
          altUnit: 'box',
          conversionRate: '24',
          cost: '0.45',
          price: '1.00',
          stock: '72',
          reserved: '0',
          min: '24',
          supId: sup2Id,
        },
        {
          id: 'prod_vital_500',
          sku: 'SFT-VITAL-500',
          name: 'Vital Mineral Water 500ml',
          nameKm: 'ទឹកបរិសុទ្ធវីតាល់ ៥០០មល',
          categoryId: softCatId,
          brand: 'Vital',
          unit: 'bottle',
          altUnit: 'carton',
          conversionRate: '24',
          cost: '0.20',
          price: '0.75',
          stock: '150',
          reserved: '0',
          min: '30',
          supId: sup2Id,
        },
        {
          id: 'prod_beef_jerky',
          sku: 'SNK-BEEF-JERKY',
          name: 'Khmer Dried Beef Jerky (Pack)',
          nameKm: 'សាច់គោក្រៀមខ្មែរ (កញ្ចប់)',
          categoryId: snackCatId,
          brand: 'Kitchen Special',
          unit: 'pack',
          altUnit: 'box',
          conversionRate: '10',
          cost: '3.00',
          price: '6.00',
          stock: '15',
          reserved: '0',
          min: '5',
          supId: '',
        },
      ]

      for (const p of seedProducts) {
        if (p.id === 'prod_ang_can') angkorProdId = p.id
        await appendRow(SHEETS.Products, [
          p.id,
          p.sku,
          p.name,
          p.nameKm,
          p.categoryId,
          p.brand,
          p.unit,
          p.cost,
          p.price,
          p.stock,
          p.reserved,
          p.min,
          p.supId,
          'Seeded product',
          '',
          'true',
          now,
          now,
          (p as any).altUnit || '',
          (p as any).conversionRate || '1',
        ])

        // Initial stock in ledger
        await appendRow(SHEETS.StockTransactions, [
          generateId(),
          p.id,
          'STOCK_IN',
          p.stock,
          '0',
          p.stock,
          p.cost,
          'USD',
          'INIT-STOCK',
          'Opening Inventory Balance',
          'Initial venue setup stock',
          adminId,
          now,
        ])
      }
    } else {
      // Ensure all existing products have two scales (main unit & packaging unit) configured
      for (const p of existingProds) {
        if (!p.altUnit || Number(p.conversionRate || 0) <= 1) {
          const rawBase = (p.unit || 'can').split('/')[0].trim()
          const alt = rawBase === 'bottle' ? 'carton' : (rawBase === 'pack' ? 'box' : 'box')
          const rate = rawBase === 'pack' ? '10' : '24'
          await updateRowById(SHEETS.Products, p.id, {
            unit: rawBase,
            altUnit: alt,
            conversionRate: rate,
          })
        }
      }
    }

    // 6. Sample Customer Leftover Record
    const existingLeftovers = await getAllRows(SHEETS.CustomerRecords)
    if (existingLeftovers.length === 0 && angkorProdId) {
      const now = new Date().toISOString()
      const recId = generateId()
      const recNum = 'CLR-2026-1001'
      const itemId = generateId()

      await appendRow(SHEETS.CustomerRecords, [
        recId,
        recNum,
        'Vireak Rith (វីរៈ រិទ្ធ)',
        '012 345 678',
        '012345678',
        'HELD',
        'Locker #14 (ទូផ្ញើលេខ ១៤)',
        'VIP Room 8 regular guest, stored at 2:00 AM',
        staffId,
        now,
        now,
      ])

      await appendRow(SHEETS.CustomerItems, [
        itemId,
        recId,
        angkorProdId,
        'Angkor Beer Can 330ml',
        '12',
        '0',
        '12',
        'can',
        now,
        now,
      ])
    }

    return NextResponse.json({ success: true, message: 'Seed data created successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Seed failed' }, { status: 500 })
  }
}
