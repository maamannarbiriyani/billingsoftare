"use server";

import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const MIN_PASSWORD_LENGTH = 6;

/** Sets the owner account the first time, or changes it with the current password. */
export async function upsertOwnerAccount(formData: FormData) {
  await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  try {
    const existing = await prisma.ownerAccount.findFirst();
    // Once set, only someone who knows the owner password can change it —
    // otherwise any admin login could reset it and unlock every branch.
    if (existing) {
      const current = (formData.get("currentPassword") as string) || "";
      if (!current || !(await bcrypt.compare(current, existing.password))) {
        await new Promise((r) => setTimeout(r, 1000));
        return { error: "Current owner password is wrong" };
      }
    } else if (!username) {
      return { error: "Username is required" };
    }

    const hashed = await bcrypt.hash(password, 10);
    if (existing) {
      await prisma.ownerAccount.update({
        where: { id: existing.id },
        data: { username: username || existing.username, password: hashed },
      });
    } else {
      await prisma.ownerAccount.create({ data: { username, password: hashed } });
    }
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to save owner password" };
  }
}

/**
 * Forgotten owner password: sets a new one without the old one. Only the main
 * admin login (not tied to a branch) can do this, and must re-enter its own
 * login password — branch logins must not be able to unlock every branch.
 */
export async function resetOwnerPassword(formData: FormData) {
  await requireAdmin();
  const session = await getSession();

  const loginPassword = (formData.get("loginPassword") as string) || "";
  const password = formData.get("password") as string;

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  try {
    // Read from the database: the session cookie can be up to 7 days old
    const user = await prisma.user.findUnique({ where: { id: Number(session?.id) } });
    if (!user || user.role !== "Admin" || user.branchId) {
      return { error: "Only the main admin login can reset the owner password" };
    }
    if (!loginPassword || !(await bcrypt.compare(loginPassword, user.password))) {
      await new Promise((r) => setTimeout(r, 1000));
      return { error: "Your login password is wrong" };
    }

    const existing = await prisma.ownerAccount.findFirst();
    if (!existing) return { error: "No owner password is set yet" };

    const hashed = await bcrypt.hash(password, 10);
    await prisma.ownerAccount.update({ where: { id: existing.id }, data: { password: hashed } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to reset owner password" };
  }
}
