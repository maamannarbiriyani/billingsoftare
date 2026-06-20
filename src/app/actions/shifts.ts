"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranchId } from "@/lib/auth";

export async function getActiveShift() {
  const branchId = await getActiveBranchId();
  if (!branchId) return null;
  const shift = await prisma.shift.findFirst({
    where: { status: "OPEN", branchId },
    orderBy: { openedAt: "desc" }
  });
  return shift;
}

export async function openShift(openingBalance: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  const active = await getActiveShift();
  if (active) {
    return { error: "A shift is already open." };
  }

  try {
    const shift = await prisma.shift.create({
      data: {
        branchId,
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
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status === "CLOSED" || shift.branchId !== branchId) {
      return { error: "Shift not found or already closed." };
    }

    // Calculate cash sales from invoices created during this shift (exclude refunds)
    const now = new Date();
    const invoices = await prisma.invoice.findMany({
      where: {
        branchId,
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
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  return await prisma.shift.findMany({
    where: { branchId },
    orderBy: { openedAt: "desc" },
    take: 20
  });
}
