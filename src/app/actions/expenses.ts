"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getActiveBranchId } from "@/lib/auth";

export async function createExpense(formData: FormData) {
  const amountStr = formData.get("amount") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("date") as string;

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || !description || !category || !dateStr) {
    return { error: "Amount, Description, Category, and Date are required." };
  }

  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    await prisma.expense.create({
      data: {
        amount,
        description,
        category,
        date: new Date(dateStr),
        branchId,
      },
    });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return { error: "Failed to create expense." };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteExpense(id: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (expense?.branchId !== branchId) return { error: "Expense not found" };

    await prisma.expense.delete({
      where: { id },
    });
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { error: "Failed to delete expense." };
  }
}
