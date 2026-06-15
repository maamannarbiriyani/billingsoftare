"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPendingOnlineOrders() {
  return prisma.order.findMany({
    where: {
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
  try {
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
  try {
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
