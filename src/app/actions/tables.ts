"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CartItem } from "./billing";
import { getActiveBranchId } from "@/lib/auth";

export async function getTables() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  return await prisma.table.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
  });
}

export async function createTable(name: string) {
  if (!name) return { error: "Table name is required" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const table = await prisma.table.create({ data: { name, branchId } });
    revalidatePath("/billing");
    return { success: true, table };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "Table name must be unique" };
    return { error: "Failed to create table" };
  }
}

export async function getRunningOrders() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  return await prisma.order.findMany({
    where: { status: "RUNNING", branchId },
    include: {
      table: true,
      items: { include: { product: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function parkOrder(
  tableId: number | null,
  cart: CartItem[],
  existingOrderId?: number | null
) {
  if (cart.length === 0) return { error: "Cannot park an empty order" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // If table is provided, mark it as occupied
      if (tableId) {
        await tx.table.updateMany({
          where: { id: tableId, branchId },
          data: { status: "OCCUPIED" }
        });
      }

      if (existingOrderId) {
        // Update existing order: first delete old items, then add new ones
        await tx.orderItem.deleteMany({ where: { orderId: existingOrderId } });
        const updatedOrder = await tx.order.update({
          where: { id: existingOrderId },
          data: {
            tableId,
            items: {
              create: cart.map(i => ({
                productId: i.productId,
                qty: i.qty,
                price: i.price,
                costPrice: i.costPrice,
                gstRate: i.gstRate || 0,
                gstAmount: i.gstAmount || 0
              }))
            }
          }
        });
        return updatedOrder;
      } else {
        // Create new order
        const newOrder = await tx.order.create({
          data: {
            branchId,
            tableId,
            status: "RUNNING",
            items: {
              create: cart.map(i => ({
                productId: i.productId,
                qty: i.qty,
                price: i.price,
                costPrice: i.costPrice,
                gstRate: i.gstRate || 0,
                gstAmount: i.gstAmount || 0
              }))
            }
          }
        });
        return newOrder;
      }
    });

    revalidatePath("/billing");
    return { success: true, orderId: result.id };
  } catch (error) {
    console.error("Park Order Error:", error);
    return { error: "Failed to park order" };
  }
}

export async function closeOrder(orderId: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
        include: { table: true }
      });

      // Release table if no other running orders are using it
      if (order.tableId) {
        const otherRunning = await tx.order.count({
          where: { tableId: order.tableId, status: "RUNNING", id: { not: orderId }, branchId }
        });
        if (otherRunning === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: "AVAILABLE" }
          });
        }
      }
      return order;
    });
    
    revalidatePath("/billing");
    return { success: true };
  } catch (error) {
    console.error("Close Order Error:", error);
    return { error: "Failed to close order" };
  }
}
