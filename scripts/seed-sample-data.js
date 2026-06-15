const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.table.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shift.deleteMany();

  console.log('Injecting HOTEL sample data for all sections...');

  // 1. Settings
  await prisma.setting.create({
    data: {
      storeName: 'Grand Oasis Hotel & Resort',
      gstNumber: '22AAAAA0000A1Z5',
      address: '45 Beach View Road, Coastal City',
      printerName: 'POS-80C',
    }
  });
  console.log('✅ Settings added');

  // 2. Users (Admin might exist, let's just add a cashier/receptionist)
  const passwordHash = await bcrypt.hash('reception123', 10);
  const cashierExists = await prisma.user.findUnique({ where: { username: 'receptionist' } });
  if (!cashierExists) {
    await prisma.user.create({
      data: { username: 'receptionist', password: passwordHash, role: 'Cashier' }
    });
    console.log('✅ Receptionist added');
  }

  // 3. Products (Hotel related: Room service, Minibar, Services, and Inventory items)
  const products = await Promise.all([
    // Sellable Items (Restaurant / Room Service / Services)
    prisma.product.create({ data: { name: 'Buffet Breakfast', barcode: 'H1001', price: 499, costPrice: 200, gstRate: 5, stock: 100, category: 'Food & Beverage' } }),
    prisma.product.create({ data: { name: 'Club Sandwich', barcode: 'H1002', price: 250, costPrice: 80, gstRate: 5, stock: 50, category: 'Room Service' } }),
    prisma.product.create({ data: { name: 'Minibar: Mineral Water 1L', barcode: 'H1003', price: 80, costPrice: 20, gstRate: 0, stock: 300, category: 'Minibar' } }),
    prisma.product.create({ data: { name: 'Minibar: Cola 300ml', barcode: 'H1004', price: 120, costPrice: 30, gstRate: 5, stock: 150, category: 'Minibar' } }),
    prisma.product.create({ data: { name: 'Laundry Service (Per Piece)', barcode: 'H1005', price: 150, costPrice: 50, gstRate: 18, stock: 999, category: 'Services' } }),
    prisma.product.create({ data: { name: 'Extra Bed Charge', barcode: 'H1006', price: 1000, costPrice: 0, gstRate: 12, stock: 20, category: 'Services' } }),
    
    // Inventory Items (Purchased from suppliers, not usually sold directly)
    prisma.product.create({ data: { name: 'Bulk Coffee Beans 1kg', barcode: 'INV001', price: 1200, costPrice: 800, gstRate: 5, stock: 15, category: 'Inventory-F&B' } }),
    prisma.product.create({ data: { name: 'Premium Bed Sheets', barcode: 'INV002', price: 0, costPrice: 600, gstRate: 12, stock: 40, category: 'Inventory-Linen' } }),
    prisma.product.create({ data: { name: 'Toiletries Kit', barcode: 'INV003', price: 0, costPrice: 45, gstRate: 18, stock: 500, category: 'Inventory-Supplies' } }),
    prisma.product.create({ data: { name: 'Cleaning Liquid 5L', barcode: 'INV004', price: 0, costPrice: 350, gstRate: 18, stock: 20, category: 'Inventory-Housekeeping' } }),
  ]);
  console.log('✅ Hotel Products & Inventory items added');

  // 4. Customers (Guests)
  const c1 = await prisma.customer.create({ data: { name: 'Rajeev Sharma (Room 204)', phone: '9876543210', balance: 500 } });
  const c2 = await prisma.customer.create({ data: { name: 'Anita Desai (Room 301)', phone: '9876543211', balance: 0 } });
  const c3 = await prisma.customer.create({ data: { name: 'Corporate Account: TechCorp', phone: '9876543212', balance: 15000 } });
  console.log('✅ Guests/Customers added');

  // 5. Invoices & Items
  // Guest checkout invoice
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-' + Date.now(),
      customerId: c1.id,
      subtotal: 749,
      gstRate: 5,
      gstAmount: 37.45,
      total: 786.45,
      paymentMethod: 'Credit Card',
      status: 'PAID',
      items: {
        create: [
          { productId: products[0].id, qty: 1, price: 499, costPrice: 200 }, // Buffet Breakfast
          { productId: products[1].id, qty: 1, price: 250, costPrice: 80 }   // Club Sandwich
        ]
      }
    }
  });
  // Corporate account billing
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-' + (Date.now() + 1),
      customerId: c3.id,
      subtotal: 2000,
      gstRate: 12,
      gstAmount: 240,
      total: 2240,
      paymentMethod: 'Bank Transfer',
      status: 'UNPAID',
      items: {
        create: [
          { productId: products[5].id, qty: 2, price: 1000, costPrice: 0 } // Extra Bed
        ]
      }
    }
  });
  console.log('✅ Invoices added');

  // 6. Payments
  await prisma.payment.create({ data: { amount: 786.45, customerId: c1.id } });
  await prisma.payment.create({ data: { amount: 5000, customerId: c3.id } }); // Partial payment from TechCorp
  console.log('✅ Payments added');

  // 7. Expenses
  await prisma.expense.create({ data: { amount: 5500, description: 'Monthly Electricity Bill', category: 'Utilities' } });
  await prisma.expense.create({ data: { amount: 1200, description: 'Plumbing Repair for Room 102', category: 'Maintenance' } });
  console.log('✅ Expenses added');

  // 8. Suppliers
  const s1 = await prisma.supplier.create({ data: { name: 'Metro Linen Suppliers', phone: '9000000001', gstNumber: '22BBBBB0000B1Z5', address: 'Textile Market' } });
  const s2 = await prisma.supplier.create({ data: { name: 'CleanPro Chemicals & Toiletries', phone: '9000000002', gstNumber: '22CCCCC0000C1Z5', address: 'Industrial Area Phase 2' } });
  console.log('✅ Suppliers added');

  // 9. Purchase Invoices (Inventory restock)
  await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: 'PINV-' + Date.now(),
      supplierId: s1.id,
      total: 6000,
      status: 'PAID',
      items: {
        create: [
          { productId: products[7].id, qty: 10, costPrice: 600 } // Premium Bed Sheets
        ]
      }
    }
  });
  await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: 'PINV-' + (Date.now() + 1),
      supplierId: s2.id,
      total: 9000,
      status: 'UNPAID',
      items: {
        create: [
          { productId: products[8].id, qty: 200, costPrice: 45 } // Toiletries Kit
        ]
      }
    }
  });
  console.log('✅ Purchase Invoices added');

  // 10. Tables (For Hotel Restaurant)
  const t1 = await prisma.table.create({ data: { name: 'Restaurant T1', status: 'OCCUPIED' } });
  const t2 = await prisma.table.create({ data: { name: 'Restaurant T2', status: 'AVAILABLE' } });
  const t3 = await prisma.table.create({ data: { name: 'Room Service (Room 405)', status: 'AVAILABLE' } });
  console.log('✅ Restaurant Tables & Room Service added');

  // 11. Orders (Restaurant / Room Service Orders)
  await prisma.order.create({
    data: {
      tableId: t1.id,
      status: 'RUNNING',
      items: {
        create: [
          { productId: products[0].id, qty: 2, price: 499, costPrice: 200, gstRate: 5, gstAmount: 49.9 }
        ]
      }
    }
  });
  console.log('✅ Restaurant Orders added');

  // 12. Shifts
  await prisma.shift.create({
    data: {
      openedAt: new Date(new Date().setHours(6, 0, 0, 0)), // Morning shift
      openingBalance: 5000,
      cashSales: 1500,
      status: 'OPEN'
    }
  });
  console.log('✅ Shifts added');

  console.log('🎉 Hotel sample data injected successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
