import { PrismaClient } from '@prisma/client'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const prisma = new PrismaClient()

async function resetSequence(tableName) {
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), coalesce(max(id), 1), true) FROM "${tableName}";`)
  } catch(e) {
    console.error(`Could not reset sequence for ${tableName}:`, e)
  }
}

function parseDate(val) {
  if (!val) return null
  return new Date(val)
}

async function migrate() {
  const db = await open({
    filename: './prisma/dev.db',
    driver: sqlite3.Database
  })
  
  // 1. User
  const users = await db.all('SELECT * FROM "User"')
  for(const user of users) {
    try {
       await prisma.user.create({ data: user })
    } catch(e) { console.log('Skipping user', user.id, e.message) }
  }
  await resetSequence('User')
  console.log(`Migrated ${users.length} Users`)

  // 2. Product
  const products = await db.all('SELECT * FROM "Product"')
  for(const prod of products) {
    try {
       await prisma.product.create({ data: prod })
    } catch(e) { console.log('Skipping product', prod.id, e.message) }
  }
  await resetSequence('Product')
  console.log(`Migrated ${products.length} Products`)

  // 3. Order
  const orders = await db.all('SELECT * FROM "Order"')
  for(const order of orders) {
    try {
       const data = { ...order }
       if (data.createdAt) data.createdAt = parseDate(data.createdAt)
       if (data.updatedAt) data.updatedAt = parseDate(data.updatedAt)
       await prisma.order.create({ data })
    } catch(e) { console.log('Skipping order', order.id, e.message) }
  }
  await resetSequence('Order')
  console.log(`Migrated ${orders.length} Orders`)

  // 4. OrderItem
  const orderItems = await db.all('SELECT * FROM "OrderItem"')
  for(const item of orderItems) {
    try {
       await prisma.orderItem.create({ data: item })
    } catch(e) { console.log('Skipping orderItem', item.id, e.message) }
  }
  await resetSequence('OrderItem')
  console.log(`Migrated ${orderItems.length} OrderItems`)

  // 5. Invoice
  const invoices = await db.all('SELECT * FROM "Invoice"')
  for(const inv of invoices) {
    try {
       const data = { ...inv }
       if (data.createdAt) data.createdAt = parseDate(data.createdAt)
       await prisma.invoice.create({ data })
    } catch(e) { console.log('Skipping invoice', inv.id, e.message) }
  }
  await resetSequence('Invoice')
  console.log(`Migrated ${invoices.length} Invoices`)

  // 6. InvoiceItem
  const invoiceItems = await db.all('SELECT * FROM "InvoiceItem"')
  for(const item of invoiceItems) {
    try {
       await prisma.invoiceItem.create({ data: item })
    } catch(e) { console.log('Skipping invoiceItem', item.id, e.message) }
  }
  await resetSequence('InvoiceItem')
  console.log(`Migrated ${invoiceItems.length} InvoiceItems`)

  console.log("Migration complete!")
  await db.close()
  await prisma.$disconnect()
}

migrate().catch(console.error)
