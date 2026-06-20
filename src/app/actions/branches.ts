"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBranch(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!name) return { error: "Branch name is required" };

  try {
    await prisma.branch.create({ data: { name, address, phone } });
    revalidatePath("/settings/branches");
    return { success: true };
  } catch {
    return { error: "Failed to create branch" };
  }
}

export async function updateBranch(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!name) return { error: "Branch name is required" };

  try {
    await prisma.branch.update({ where: { id }, data: { name, address, phone } });
    revalidatePath("/settings/branches");
    return { success: true };
  } catch {
    return { error: "Failed to update branch" };
  }
}

export async function deleteBranch(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  try {
    await prisma.branch.delete({ where: { id } });
    revalidatePath("/settings/branches");
    return { success: true };
  } catch {
    return { error: "Failed to delete branch" };
  }
}

export async function getAllBranches() {
  return await prisma.branch.findMany({ orderBy: { id: "asc" } });
}

export async function setActiveBranch(branchId: number) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("activeBranchId", branchId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/");
}
