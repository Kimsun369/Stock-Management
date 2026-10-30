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

    // Product records and opening stock are entered from verified inventory data.
    // This setup endpoint must not invent product codes, prices, stock, or conversions.
    const existingProds = await getAllRows(SHEETS.Products)
    const angkorProdId = ''

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
