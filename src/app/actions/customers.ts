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

      // Update customer balance securely
      const updateRes = await tx.customer.updateMany({
        where: { id: customerId, balance: { gte: amount } },
        data: {
          balance: { decrement: amount },
        },
      });

      if (updateRes.count === 0) {
        throw new Error("Concurrent transaction detected: Payment exceeds outstanding balance.");
      }

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
    if (phone?.trim()) {
      const existing = await prisma.customer.findFirst({
        where: { phone: phone.trim(), branchId }
      });
      if (existing) return { error: "A customer with this phone number already exists." };
    }

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
    if (phone?.trim()) {
      const existing = await prisma.customer.findFirst({
        where: { phone: phone.trim(), branchId, id: { not: id } }
      });
      if (existing) return { error: "Another customer is already using this phone number." };
    }

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

    if (customer.balance > 0) {
      return { error: `Cannot delete this customer because they owe a balance of ₹${customer.balance.toFixed(2)}.` };
    }

    await prisma.$transaction(async (tx) => {
      // Delete any payment history logs first to prevent foreign key constraints
      await tx.payment.deleteMany({ where: { customerId: id } });
      // Then delete the customer
      await tx.customer.delete({ where: { id } });
    });
    
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Customer Error:", error);
    return { error: "Failed to delete customer" };
  }
}
