"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export type ReturnItemInput = {
  invoiceItemId: number;
  productId: number;
  qtyToReturn: number;
};

export async function processReturn(invoiceId: number, returnItems: ReturnItemInput[]) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch invoice to ensure it exists and get current values
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      });

      if (!invoice) throw new Error("Invoice not found.");

      let totalRefundAmount = 0;

      // 2. Process each returned item
      for (const returnItem of returnItems) {
        if (returnItem.qtyToReturn <= 0) continue;

        const itemRecord = invoice.items.find(i => i.id === returnItem.invoiceItemId);
        if (!itemRecord) throw new Error(`InvoiceItem ${returnItem.invoiceItemId} not found.`);

        const maxReturnable = itemRecord.qty - itemRecord.returnedQty;
        if (returnItem.qtyToReturn > maxReturnable) {
          throw new Error(`Cannot return more than ${maxReturnable} for item ${itemRecord.id}`);
        }

        // price is per-unit; multiply by qty being returned
        const refundAmountForItem = itemRecord.price * returnItem.qtyToReturn;
        totalRefundAmount += refundAmountForItem;

        // Update InvoiceItem
        await tx.invoiceItem.update({
          where: { id: itemRecord.id },
          data: {
            returnedQty: { increment: returnItem.qtyToReturn }
          }
        });

        // Restock Product
        await tx.product.update({
          where: { id: returnItem.productId },
          data: {
            stock: { increment: returnItem.qtyToReturn }
          }
        });
      }

      if (totalRefundAmount === 0) return { success: true };

      // 3. Recalculate Invoice Totals (proportional discount on refunded portion)
      const refundSubtotal = totalRefundAmount;
      const refundGst = parseFloat(((refundSubtotal * invoice.gstRate) / 100).toFixed(2));
      const discountRatio = invoice.subtotal > 0 ? invoice.discountAmount / invoice.subtotal : 0;
      const refundDiscount = parseFloat((refundSubtotal * discountRatio).toFixed(2));
      const refundGrandTotal = parseFloat((refundSubtotal + refundGst - refundDiscount).toFixed(2));

      const newSubtotal = parseFloat((invoice.subtotal - refundSubtotal).toFixed(2));
      const newGstAmount = parseFloat((invoice.gstAmount - refundGst).toFixed(2));
      const newDiscountAmount = parseFloat((invoice.discountAmount - refundDiscount).toFixed(2));
      const newTotal = parseFloat((invoice.total - refundGrandTotal).toFixed(2));

      // Determine new status
      let newStatus = "PARTIAL_REFUND";
      const allItemsFullyReturned = invoice.items.every(i => {
        const matchingReturn = returnItems.find(r => r.invoiceItemId === i.id);
        const returningNow = matchingReturn ? matchingReturn.qtyToReturn : 0;
        return (i.returnedQty + returningNow) >= i.qty;
      });

      if (allItemsFullyReturned) {
        newStatus = "REFUNDED";
      }

      // Update Invoice
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: Math.max(0, newSubtotal),
          gstAmount: Math.max(0, newGstAmount),
          discountAmount: Math.max(0, newDiscountAmount),
          total: Math.max(0, newTotal),
          status: newStatus,
        }
      });

      // 4. Update Customer Balance if CREDIT payment
      if (invoice.paymentMethod === "CREDIT" && invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            balance: { decrement: refundGrandTotal }
          }
        });
      }

      return { success: true, refundedAmount: refundGrandTotal };
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/reports");
    revalidatePath("/inventory");
    revalidatePath("/customers");

    return result;
  } catch (error: any) {
    console.error("Return Process Error:", error);
    return { error: error.message || "Failed to process return." };
  }
}

// ── Modify a generated invoice ─────────────────────────────────────
export type ModifyItem = {
  itemId?: number;       // undefined = new item to add
  productId: number;
  qty: number;
  price: number;
  costPrice?: number;
};

export async function modifyInvoice(
  invoiceId: number,
  data: {
    items: ModifyItem[];
    discountAmount: number;
    paymentMethod: string;
    gstRate: number;
    notes?: string;
  }
) {
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      });
      if (!invoice) throw new Error("Invoice not found");

      const oldItemsMap = new Map(invoice.items.map((i) => [i.id, i]));
      const newItemsById = new Map(
        data.items.filter((i) => i.itemId != null).map((i) => [i.itemId!, i])
      );

      // 1. Remove deleted items — restore sellable stock
      for (const old of invoice.items) {
        if (!newItemsById.has(old.id)) {
          const toRestore = old.qty - old.returnedQty;
          if (toRestore > 0) {
            await tx.product.updateMany({
              where: { id: old.productId, stock: { not: 999999 } },
              data: { stock: { increment: toRestore } },
            });
          }
          await tx.invoiceItem.delete({ where: { id: old.id } });
        }
      }

      // 2. Update existing items — handle stock delta
      for (const [itemId, newItem] of newItemsById) {
        const old = oldItemsMap.get(itemId);
        if (!old) continue;
        const delta = newItem.qty - old.qty;
        if (delta > 0) {
          const prod = await tx.product.findUnique({
            where: { id: old.productId },
            select: { stock: true, name: true },
          });
          if (prod && prod.stock !== 999999 && prod.stock < delta) {
            throw new Error(`Not enough stock for "${prod.name}". Available: ${prod.stock}`);
          }
          await tx.product.updateMany({
            where: { id: old.productId, stock: { not: 999999 } },
            data: { stock: { decrement: delta } },
          });
        } else if (delta < 0) {
          await tx.product.updateMany({
            where: { id: old.productId, stock: { not: 999999 } },
            data: { stock: { increment: Math.abs(delta) } },
          });
        }
        await tx.invoiceItem.update({
          where: { id: itemId },
          data: { qty: newItem.qty, price: newItem.price },
        });
      }

      // 3. Add new items
      for (const item of data.items.filter((i) => i.itemId == null)) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true },
        });
        if (prod && prod.stock !== 999999 && prod.stock < item.qty) {
          throw new Error(`Not enough stock for "${prod.name}". Available: ${prod.stock}`);
        }
        await tx.product.updateMany({
          where: { id: item.productId, stock: { not: 999999 } },
          data: { stock: { decrement: item.qty } },
        });
        await tx.invoiceItem.create({
          data: {
            invoiceId,
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            costPrice: item.costPrice ?? 0,
          },
        });
      }

      // 4. Recalculate totals from persisted items
      const updatedItems = await tx.invoiceItem.findMany({ where: { invoiceId } });
      const newSubtotal = parseFloat(
        updatedItems.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)
      );
      const newGst = parseFloat(((newSubtotal * data.gstRate) / 100).toFixed(2));
      const disc = parseFloat(data.discountAmount.toFixed(2));
      const newTotal = parseFloat(Math.max(0, newSubtotal + newGst - disc).toFixed(2));

      // 5. Adjust CREDIT balance if payment method was or is CREDIT
      const oldTotal = invoice.total;
      if (invoice.customerId) {
        if (invoice.paymentMethod === "CREDIT" && data.paymentMethod === "CREDIT") {
          const diff = newTotal - oldTotal;
          if (diff !== 0) {
            await tx.customer.update({
              where: { id: invoice.customerId },
              data: { balance: { increment: diff } },
            });
          }
        } else if (invoice.paymentMethod === "CREDIT" && data.paymentMethod !== "CREDIT") {
          // Switched away from credit — clear the old balance
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { balance: { decrement: oldTotal } },
          });
        } else if (invoice.paymentMethod !== "CREDIT" && data.paymentMethod === "CREDIT") {
          // Switched to credit — add new total as balance
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { balance: { increment: newTotal } },
          });
        }
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: newSubtotal,
          gstRate: data.gstRate,
          gstAmount: newGst,
          discountAmount: disc,
          total: newTotal,
          paymentMethod: data.paymentMethod,
          status: "PAID",
          notes: data.notes ?? invoice.notes,
        },
      });
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/reports");
    revalidatePath("/products");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Modify Invoice Error:", error);
    return { error: error.message || "Failed to modify invoice" };
  }
}

// ── Delete invoice with admin password auth ────────────────────────
export async function deleteInvoiceWithAuth(invoiceId: number, password: string) {
  try {
    const session = await getSession();
    if (!session?.id) return { error: "Not authenticated" };

    const user = await prisma.user.findUnique({ where: { id: session.id as number } });
    if (!user) return { error: "User not found" };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return { error: "Incorrect password" };

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      });
      if (!invoice) throw new Error("Invoice not found");

      // Restore stock for all non-returned quantities
      for (const item of invoice.items) {
        const toRestore = item.qty - item.returnedQty;
        if (toRestore > 0) {
          await tx.product.updateMany({
            where: { id: item.productId, stock: { not: 999999 } },
            data: { stock: { increment: toRestore } },
          });
        }
      }

      // Reverse customer credit balance
      if (invoice.paymentMethod === "CREDIT" && invoice.customerId && invoice.total > 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { balance: { decrement: invoice.total } },
        });
      }

      // Cancel linked order if exists
      if (invoice.orderId) {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { status: "CANCELLED" },
        }).catch(() => {}); // ignore if order doesn't exist
      }

      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoice.delete({ where: { id: invoiceId } });
    });

    revalidatePath("/invoices");
    revalidatePath("/reports");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Invoice Error:", error);
    return { error: error.message || "Failed to delete invoice" };
  }
}
