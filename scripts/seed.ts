import { getAllRows, appendRow, initializeSheets, SHEETS, generateId } from '@/backend/sheets'
import bcrypt from 'bcryptjs'

async function runSeed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run seed in production environment (NODE_ENV=production).')
    process.exit(1)
  }

  if (process.env.CONFIRM_SEED !== 'yes') {
    console.error('❌ Missing CONFIRM_SEED=yes environment variable. Run with CONFIRM_SEED=yes to proceed.')
    process.exit(1)
  }

  console.log('🌱 Starting local database seed...')
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
    console.log('✅ AppSettings seeded')
  }

  // 2. Users
  const existingUsers = await getAllRows(SHEETS.Users)
  if (existingUsers.length === 0) {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD
    const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator'

    if (!adminEmail || !adminPassword) {
      console.error('❌ INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in env for seed.')
      process.exit(1)
    }

    const adminId = generateId()
    const staffId = generateId()
    const adminPass = await bcrypt.hash(adminPassword, 10)
    const staffPass = await bcrypt.hash('StaffTempPass!2026', 10)
    const now = new Date().toISOString()

    await appendRow(SHEETS.Users, [
      adminId,
      adminName,
      adminEmail.toLowerCase().trim(),
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
    console.log('✅ Users seeded')
  }

  // 3. Categories
  const existingCats = await getAllRows(SHEETS.Categories)
  if (existingCats.length === 0) {
    const now = new Date().toISOString()
    await appendRow(SHEETS.Categories, [
      'cat_beer',
      'Beer & Cider',
      'ស្រាបៀរ និងស៊ីដឺ',
      'Canned and bottled beers for karaoke rooms',
      'true',
      now,
      now,
      '17.00',
    ])
    await appendRow(SHEETS.Categories, [
      'cat_soft',
      'Soft Drinks & Water',
      'ភេសជ្ជៈ និងទឹកបរិសុទ្ធ',
      'Carbonated drinks, mineral water, energy drinks',
      'true',
      now,
      now,
      '12.00',
    ])
    await appendRow(SHEETS.Categories, [
      'cat_snack',
      'Bar Snacks & Food Ingredients',
      'គ្រឿងក្លែម និងគ្រឿងផ្សំម្ហូប',
      'Karaoke finger food and snacks',
      'true',
      now,
      now,
      '36.25',
    ])
    console.log('✅ Categories seeded')
  }

  // 4. Suppliers
  const existingSups = await getAllRows(SHEETS.Suppliers)
  if (existingSups.length === 0) {
    const now = new Date().toISOString()
    await appendRow(SHEETS.Suppliers, [
      'sup_angkor',
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
      'sup_khmerbev',
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
    console.log('✅ Suppliers seeded')
  }

  console.log('🎉 Seed completed successfully.')
}

runSeed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
