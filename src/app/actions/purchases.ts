"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranchId } from "@/lib/auth";

export async function getSuppliers() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  const suppliers = await prisma.supplier.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
  });
  return suppliers;
}

export async function createSupplier(data: { name: string; phone?: string; gstNumber?: string; address?: string }) {
  if (!data.name) return { error: "Supplier name is required" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  
  try {
    await prisma.supplier.create({ data: { ...data, branchId } });
    revalidatePath("/purchases");
    return { success: true };
  } catch (error) {
    console.error("Failed to create supplier:", error);
    return { error: "Failed to create supplier" };
  }
}

export async function getPurchaseInvoices() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  return await prisma.purchaseInvoice.findMany({
    where: { branchId },
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

  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the purchase invoice
      const invoice = await tx.purchaseInvoice.create({
        data: {
          branchId,
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
        await tx.product.updateMany({
          where: { id: item.productId, branchId },
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
