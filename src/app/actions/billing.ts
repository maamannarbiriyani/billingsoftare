"use server";

import { prisma } from "@/lib/prisma";
import { getSession, getActiveBranchId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function searchProductsForBilling(query: string) {
  if (!query || query.trim() === "") {
    return [];
  }
  const branchId = await getActiveBranchId();
  if (!branchId) return [];

  const products = await prisma.product.findMany({
    where: {
      branchId,
      isActive: true,
      OR: [{ name: { contains: query } }, { barcode: { contains: query } }],
    },
    take: 10,
  });

  return products;
}

export async function getAllProductsForBilling() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  const products = await prisma.product.findMany({
    where: { branchId, isActive: true },
    orderBy: [
      { display_order: 'asc' },
      { name: 'asc' }
    ]
  });
  return products;
}

export async function getAllCustomersForBilling() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  const customers = await prisma.customer.findMany({
    where: { branchId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, phone: true, balance: true }
  });
  return customers;
}

export async function collectKhataPayment(customerId: number, amount: number) {
  if (amount <= 0) return { error: "Amount must be greater than 0" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer || customer.branchId !== branchId) throw new Error("Customer not found");
      if (amount > customer.balance) throw new Error("Amount exceeds outstanding balance of ₹" + customer.balance.toFixed(2));
      await tx.payment.create({ data: { amount, customerId, branchId } });
      await tx.customer.update({ where: { id: customerId }, data: { balance: { decrement: amount } } });
      return { newBalance: parseFloat((customer.balance - amount).toFixed(2)) };
    });
    revalidatePath("/customers");
    revalidatePath("/billing");
    return { success: true, newBalance: result.newBalance };
  } catch (e: unknown) {
    const err = e as Error;
    return { error: err.message || "Failed to collect payment" };
  }
}

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  costPrice: number;
  gstRate?: number;
  gstAmount?: number;
  qty: number;
};

export async function createInvoice(
  cart: CartItem[],
  customerData: { name: string; phone: string },
  billingDetails: {
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    discountAmount: number;
    total: number;
    paymentMethod: string;
    orderId?: number;
    orderMode?: string;
  }
) {
  if (cart.length === 0) {
    return { error: "Cart is empty" };
  }

  const session = await getSession();
  const cashierName = (session?.username as string) || "Staff";
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch selected" };

  // Retry the whole transaction a few times: if two checkouts race for the same
  // invoice number, the loser hits a P2002 unique conflict and simply recomputes.
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 0. Stock validation — prevent overselling
      for (const item of cart) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true, name: true, branchId: true } });
        if (!product || product.branchId !== branchId) throw new Error(`Product not found: ${item.productId}`);
        if (product.stock !== 999999 && product.stock < item.qty) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.qty}`);
        }
      }

      let customerId: number | undefined;
      let walkInName: string | undefined;
      let walkInPhone: string | undefined;

      // 1. Process Customer Information
      if (customerData.name) {
        if (billingDetails.paymentMethod === "CREDIT") {
          // STRICT KHATA LOGIC: Only link or create Customer records for CREDIT bills
          
          // Try to find an existing customer by phone
          if (customerData.phone) {
            const existingCustomer = await tx.customer.findFirst({
              where: { phone: customerData.phone, branchId },
            });
            if (existingCustomer) {
              customerId = existingCustomer.id;
            }
          }
          
          // Fallback: try to find by exact name match if no phone was provided or matched
          if (!customerId) {
            const existingCustomerByName = await tx.customer.findFirst({
              where: { name: customerData.name, branchId },
            });
            if (existingCustomerByName) {
              customerId = existingCustomerByName.id;
            }
          }
          
          // If STILL no existing customer found, auto-create a new Khata customer
          if (!customerId) {
            const newCustomer = await tx.customer.create({
              data: {
                name: customerData.name,
                phone: customerData.phone || null,
                branchId
              }
            });
            customerId = newCustomer.id;
          }
        } else {
          // STRICT WALK-IN LOGIC: Cash/UPI/Card are completely separate from Khata customers
          walkInName = customerData.name;
          if (customerData.phone) walkInPhone = customerData.phone;
        }
      }

      // 2. Generate unique sequential invoice number (INV-YYYYMMDD-NNNN).
      // invoiceNumber is GLOBALLY unique, so the sequence must be computed across
      // all branches for the day — not per-branch — otherwise two branches (or
      // legacy null-branch invoices) would both produce -0001 and collide.
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const prefix = `INV-${dateStr}-`;
      const lastInvoice = await tx.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: "desc" },
        select: { invoiceNumber: true },
      });
      const lastSeq = lastInvoice ? parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10) : 0;
      const invoiceNumber = `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;

      // 3. Create or Update Order if needed
      let linkedOrderId = billingDetails.orderId;
      if (linkedOrderId) {
        await tx.order.update({
          where: { id: linkedOrderId },
          data: { 
            status: "COMPLETED",
            source: billingDetails.orderMode || "DINE_IN"
          }
        });
      } else {
        // Create an implicit order to track the orderMode (source)
        const newOrder = await tx.order.create({
          data: {
            branchId,
            status: "COMPLETED",
            source: billingDetails.orderMode || "DINE_IN",
            items: {
              create: cart.map((item) => ({
                productId: item.productId,
                qty: item.qty,
                price: item.price,
                costPrice: item.costPrice,
                gstRate: item.gstRate || 0,
                gstAmount: item.gstAmount || 0,
              }))
            }
          }
        });
        linkedOrderId = newOrder.id;
      }

      // 4. Create Invoice (round all monetary values to 2dp)
      const invoice = await tx.invoice.create({
        data: {
          branchId,
          invoiceNumber,
          customerId,
          customerName: walkInName,
          customerPhone: walkInPhone,
          subtotal: parseFloat(billingDetails.subtotal.toFixed(2)),
          gstRate: parseFloat(billingDetails.gstRate.toFixed(2)),
          gstAmount: parseFloat(billingDetails.gstAmount.toFixed(2)),
          discountAmount: parseFloat(billingDetails.discountAmount.toFixed(2)),
          total: parseFloat(billingDetails.total.toFixed(2)),
          cashierName,
          paymentMethod: billingDetails.paymentMethod,
          orderId: linkedOrderId,
          items: {
            create: cart.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              price: item.price,
              costPrice: item.costPrice,
            })),
          },
        },
      });

      // 4. Update Customer Balance if CREDIT
      if (billingDetails.paymentMethod === "CREDIT") {
        if (!customerId) {
          throw new Error("Customer information is required for CREDIT payments.");
        }
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: {
              increment: billingDetails.total,
            },
          },
        });
      }

      // 5. Decrement Stock (skip unlimited-stock items)
      for (const item of cart) {
        await tx.product.updateMany({
          where: { id: item.productId, stock: { not: 999999 }, branchId },
          data: { stock: { decrement: item.qty } },
        });
      }

      return invoice;
    });

    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/billing");
    revalidatePath("/reports");

    return { success: true, invoiceId: result.id, invoiceNumber: result.invoiceNumber };
  } catch (error) {
    // Invoice-number collision (concurrent checkout): retry with a fresh number.
    if ((error as { code?: string })?.code === "P2002" && attempt < MAX_ATTEMPTS) {
      continue;
    }
    console.error("Invoice Creation Error:", error);
    // Surface the real reason (stock/customer/validation messages are user-friendly;
    // DB/connection errors are at least diagnosable instead of a blank "Failed").
    const message = error instanceof Error ? error.message : "Failed to complete transaction";
    return { error: message };
  }
  }

  return { error: "Could not generate a unique invoice number. Please try again." };
}

export async function saveKOT(cart: CartItem[], orderId?: number) {
  if (cart.length === 0) return { error: "Cart is empty" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    let finalOrderId = orderId;

    if (orderId) {
      // Update existing order: delete old items, create new
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.update({
        where: { id: orderId },
        data: {
          items: {
            create: cart.map(item => ({
              productId: item.productId,
              qty: item.qty,
              price: item.price,
              costPrice: item.costPrice,
              gstRate: item.gstRate || 0,
              gstAmount: item.gstAmount || 0,
            }))
          }
        }
      });
    } else {
      // Create new
      const order = await prisma.order.create({
        data: {
          branchId,
          source: "DINE_IN",
          status: "RECEIVED",
          items: {
            create: cart.map(item => ({
              productId: item.productId,
              qty: item.qty,
              price: item.price,
              costPrice: item.costPrice,
              gstRate: item.gstRate || 0,
              gstAmount: item.gstAmount || 0,
            }))
          }
        }
      });
      finalOrderId = order.id;
    }

    revalidatePath("/billing");
    revalidatePath("/kds");
    return { success: true, orderId: finalOrderId };
  } catch (error) {
    console.error("Save KOT error:", error);
    return { error: "Failed to save KOT" };
  }
}

