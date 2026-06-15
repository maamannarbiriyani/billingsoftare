"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const amountStr = formData.get("amount") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("date") as string;

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || !description || !category || !dateStr) {
    return { error: "Amount, Description, Category, and Date are required." };
  }

  try {
    await prisma.expense.create({
      data: {
        amount,
        description,
        category,
        date: new Date(dateStr),
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
  try {
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
