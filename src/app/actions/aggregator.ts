"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranchId } from "@/lib/auth";

export async function getPendingOnlineOrders() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  return prisma.order.findMany({
    where: {
      branchId,
      source: { in: ["SWIGGY", "ZOMATO"] },
      status: "RECEIVED",
    },
    include: {
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function acceptOnlineOrder(orderId: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order?.branchId !== branchId) return { error: "Order not found" };

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PREPARING" },
    });
    revalidatePath("/billing");
    return { success: true };
  } catch (error) {
    return { error: "Failed to accept order" };
  }
}

export async function rejectOnlineOrder(orderId: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order?.branchId !== branchId) return { error: "Order not found" };

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/billing");
    return { success: true };
  } catch (error) {
    return { error: "Failed to reject order" };
  }
}
