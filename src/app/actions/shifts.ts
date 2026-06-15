"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getActiveShift() {
  const shift = await prisma.shift.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" }
  });
  return shift;
}

export async function openShift(openingBalance: number) {
  const active = await getActiveShift();
  if (active) {
    return { error: "A shift is already open." };
  }

  try {
    const shift = await prisma.shift.create({
      data: {
        openingBalance,
        status: "OPEN"
      }
    });
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true, shift };
  } catch (error) {
    return { error: "Failed to open shift" };
  }
}

export async function closeShift(shiftId: number, closingBalance: number) {
  try {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status === "CLOSED") {
      return { error: "Shift not found or already closed." };
    }

    // Calculate cash sales from invoices created during this shift (exclude refunds)
    const now = new Date();
    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: shift.openedAt, lte: now },
        paymentMethod: "Cash",
        status: { not: "REFUNDED" },
      }
    });

    const cashSales = parseFloat(invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2));

    const closedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingBalance,
        cashSales
      }
    });

    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true, shift: closedShift };
  } catch (error) {
    return { error: "Failed to close shift" };
  }
}

export async function getRecentShifts() {
  return await prisma.shift.findMany({
    orderBy: { openedAt: "desc" },
    take: 20
  });
}
