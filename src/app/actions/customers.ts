"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranchId } from "@/lib/auth";

export async function getCustomers() {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];

  const customers = await prisma.customer.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { invoices: true },
      },
    },
  });
  return customers;
}

export async function logPayment(customerId: number, amount: number) {
  if (amount <= 0) {
    return { error: "Payment amount must be greater than 0" };
  }
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer || customer.branchId !== branchId) throw new Error("Customer not found");

      if (amount > customer.balance) {
        throw new Error("Payment exceeds outstanding balance.");
      }

      // Create payment record
      await tx.payment.create({
        data: {
          amount,
          customerId,
          branchId,
        },
      });

      // Update customer balance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: { decrement: amount },
        },
      });

      return true;
    });

    revalidatePath("/customers");
    revalidatePath("/dashboard"); // Payments might affect cash flow later
    return { success: true };
  } catch (error: any) {
    console.error("Payment Error:", error);
    return { error: error.message || "Failed to log payment" };
  }
}
