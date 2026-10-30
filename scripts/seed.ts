import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data for KaraokeStock...')

  // 1. Settings
  const defaultSettings = [
    { key: 'defaultLanguage', value: 'km' },
    { key: 'defaultCurrency', value: 'USD' },
    { key: 'exchangeRateUsdKhr', value: '4100' },
    { key: 'numeralSystem', value: 'western' },
    { key: 'lowStockGlobalThreshold', value: '5' },
  ]

  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }
  console.log('✔ App settings initialized')

  // 2. Admin & Staff accounts
  const adminHashedPassword = await bcrypt.hash('AdminPassword123!', 10)
  const staffHashedPassword = await bcrypt.hash('StaffPassword123!', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@karaokestock.com' },
    update: {},
    create: {
      name: 'System Admin (អ្នកគ្រប់គ្រង)',
      email: 'admin@karaokestock.com',
      password: adminHashedPassword,
      role: 'ADMIN',
      preferredLanguage: 'km',
      numeralSystem: 'western',
      active: true,
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: 'staff@karaokestock.com' },
    update: {},
    create: {
      name: 'Sokha Chan (ចាន់ សុខា)',
      email: 'staff@karaokestock.com',
      password: staffHashedPassword,
      role: 'STAFF',
      preferredLanguage: 'km',
      numeralSystem: 'western',
      active: true,
    },
  })
  console.log('✔ Admin & Staff accounts initialized')

  // 3. Categories (Bilingual)
  const beerCat = await prisma.category.upsert({
    where: { id: 'cat-beer' },
    update: {},
    create: {
      id: 'cat-beer',
      name: 'Beer & Cider',
      nameKm: 'ស្រាបៀរ និងស៊ីដឺ',
      description: 'Canned and bottled beers for karaoke rooms',
    },
  })

  const softDrinksCat = await prisma.category.upsert({
    where: { id: 'cat-softdrinks' },
    update: {},
    create: {
      id: 'cat-softdrinks',
      name: 'Soft Drinks & Water',
      nameKm: 'ភេសជ្ជៈ និងទឹកបរិសុទ្ធ',
      description: 'Carbonated drinks, mineral water, energy drinks',
    },
  })

  const snacksCat = await prisma.category.upsert({
    where: { id: 'cat-snacks' },
    update: {},
    create: {
      id: 'cat-snacks',
      name: 'Bar Snacks & Food Ingredients',
      nameKm: 'គ្រឿងក្លែម និងគ្រឿងផ្សំម្ហូប',
      description: 'Karaoke room finger food and kitchen ingredients',
    },
  })
  console.log('✔ Categories initialized')

  // 4. Suppliers (Bilingual)
  const supplierAngkor = await prisma.supplier.upsert({
    where: { id: 'sup-angkor' },
    update: {},
    create: {
      id: 'sup-angkor',
      name: 'Angkor Brewery Distributor',
      nameKm: 'តំណាងចែកចាយស្រាបៀរអង្គរ',
      contactPerson: 'Mr. Vanna (លោក វណ្ណា)',
      phone: '012888999',
      email: 'orders@angkorbrewery.com.kh',
      address: 'National Road 5, Phnom Penh',
    },
  })

  const supplierKhmerBev = await prisma.supplier.upsert({
    where: { id: 'sup-khmerbev' },
    update: {},
    create: {
      id: 'sup-khmerbev',
      name: 'Khmer Beverages Ltd',
      nameKm: 'ក្រុមហ៊ុន ខ្មែរ ប៊ែវើរីជីស',
      contactPerson: 'Ms. Davy (កញ្ញា ដាវី)',
      phone: '015777666',
      email: 'sales@khmerbev.com.kh',
      address: 'Hun Sen Blvd, Phnom Penh',
    },
  })
  console.log('✔ Suppliers initialized')

  // Product records and prices are entered from verified inventory data.
  // Do not seed sample products, prices, identifiers, or opening stock.

  // 6. Sample Customer Leftover Record (To demonstrate customer leftovers & collection)
  const sampleCustomer = await prisma.customer.upsert({
    where: { id: 'cust-vireak' },
    update: {},
    create: {
      id: 'cust-vireak',
      name: 'Vireak Rith (វីរៈ រិទ្ធ)',
      phone: '012 345 678',
      normalizedPhone: '012345678',
      notes: 'VIP Room 8 regular customer',
    },
  })

  const angkorProduct = await prisma.product.findUnique({
    where: { sku: 'BEER-ANG-CAN' },
  })

  if (angkorProduct) {
    const existingLeftover = await prisma.customerLeftoverRecord.findUnique({
      where: { recordNumber: 'CLR-2026-0001' },
    })

    if (!existingLeftover) {
      // 12 cans of Angkor beer left behind by customer
      const qtyLeft = 12

      // Reserve the stock
      await prisma.product.update({
        where: { id: angkorProduct.id },
        data: {
          reservedStock: { increment: qtyLeft },
        },
      })

      const record = await prisma.customerLeftoverRecord.create({
        data: {
          recordNumber: 'CLR-2026-0001',
          customerId: sampleCustomer.id,
          status: 'HELD',
          storageLocation: 'Locker #14 (ទូផ្ញើលេខ ១៤)',
          notes: 'Customer finished session at 2:00 AM, unopened cans',
          recordedByUserId: staff.id,
          items: {
            create: [
              {
                productId: angkorProduct.id,
                originalQuantity: qtyLeft,
                collectedQuantity: 0,
                remainingQuantity: qtyLeft,
                unit: 'can',
              },
            ],
          },
        },
      })

      // Add audit log
      await prisma.auditLog.create({
        data: {
          actorId: staff.id,
          action: 'REGISTER_CUSTOMER_LEFTOVER',
          entityType: 'CustomerLeftoverRecord',
          entityId: record.id,
          details: `Registered 12 cans of ${angkorProduct.name} for customer ${sampleCustomer.name}`,
        },
      })

      console.log('✔ Sample customer leftover registered with reservation')
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

