"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });
  return suppliers;
}

export async function createSupplier(data: { name: string; phone?: string; gstNumber?: string; address?: string }) {
  if (!data.name) return { error: "Supplier name is required" };
  
  try {
    await prisma.supplier.create({ data });
    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    console.error("Failed to create supplier:", error);
    return { error: "Failed to create supplier" };
  }
}

export async function getPurchaseInvoices() {
  return await prisma.purchaseInvoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      items: {
        include: { product: true }
      }
    }
  });
}

export type PurchaseCartItem = {
  productId: number;
  qty: number;
  costPrice: number;
};

export async function createPurchaseInvoice(
  supplierId: number,
  invoiceNumber: string,
  items: PurchaseCartItem[],
  total: number
) {
  if (items.length === 0) return { error: "No items provided" };
  if (!invoiceNumber) return { error: "Invoice number is required" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the purchase invoice
      const invoice = await tx.purchaseInvoice.create({
        data: {
          supplierId,
          invoiceNumber,
          total,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              costPrice: i.costPrice
            }))
          }
        }
      });

      // Update product stock and their new cost price
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.qty },
            costPrice: item.costPrice // Optionally update to latest cost price
          }
        });
      }

      return invoice;
    });

    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/inventory");
    return { success: true, id: result.id };
  } catch (error: any) {
    console.error("Purchase Creation Error:", error);
    if (error.code === 'P2002') {
      return { error: "Invoice number already exists" };
    }
    return { error: "Failed to create purchase invoice" };
  }
}
