"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function upsertOwnerAccount(formData: FormData) {
  await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username) return { error: "Username is required" };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };

  const hashed = await bcrypt.hash(password, 10);

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
    }
    if (existing) {
      await prisma.ownerAccount.update({
        where: { id: existing.id },
        data: { username, password: hashed },
      });
    } else {
      await prisma.ownerAccount.create({ data: { username, password: hashed } });
    }
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { error: "Failed to save owner account" };
  }
}
