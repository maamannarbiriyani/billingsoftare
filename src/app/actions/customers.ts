"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
  const customers = await prisma.customer.findMany({
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error("Customer not found");

      if (amount > customer.balance) {
        throw new Error("Payment exceeds outstanding balance.");
      }

      // Create payment record
      await tx.payment.create({
        data: {
          amount,
          customerId,
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
