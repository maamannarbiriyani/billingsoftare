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

export async function createCustomer(name: string, phone?: string, balance: number = 0) {
  if (!name.trim()) return { error: "Customer name is required" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        balance,
        branchId,
      },
    });
    revalidatePath("/customers");
    return { success: true, customer: newCustomer };
  } catch (error: any) {
    return { error: "Failed to create customer" };
  }
}

export async function updateCustomer(id: number, name: string, phone?: string, balance?: number) {
  if (!name.trim()) return { error: "Customer name is required" };
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id, branchId },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        ...(balance !== undefined ? { balance } : {}),
      },
    });
    revalidatePath("/customers");
    return { success: true, customer: updatedCustomer };
  } catch (error: any) {
    return { error: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    });
    
    if (!customer || customer.branchId !== branchId) {
      return { error: "Customer not found" };
    }

    if (customer._count.invoices > 0) {
      return { error: "Cannot delete this customer because they have existing bills. Delete their bills first." };
    }

    await prisma.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Customer Error:", error);
    return { error: "Failed to delete customer" };
  }
}
