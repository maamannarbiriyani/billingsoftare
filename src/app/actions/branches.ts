"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession, isBranchUnlocked } from "@/lib/auth";

const OWNER_ONLY = "Only the owner can change branches. Unlock with the owner password first.";

/** Branch management is owner business: an admin login + owner unlock. */
async function ownerUnlocked() {
  const session = await getSession();
  return !!session && session.role === "Admin" && (await isBranchUnlocked(session));
}

export async function createBranch(formData: FormData) {
  if (!(await ownerUnlocked())) return { error: OWNER_ONLY };
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
  if (!(await ownerUnlocked())) return { error: OWNER_ONLY };
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
  if (!(await ownerUnlocked())) return { error: OWNER_ONLY };
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
  // Switching branch is locked behind the owner password (see branch-lock.ts)
  const session = await getSession();
  if (!session || session.role === "Cashier") return { error: "Not allowed" };
  if (!(await isBranchUnlocked(session))) {
    return { error: "Branch switching is locked. Enter the owner password first." };
  }
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  if (!branch) return { error: "Branch not found" };

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("activeBranchId", branchId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Remembered on this device, so a shared login reopens on the same branch
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { success: true };
}
