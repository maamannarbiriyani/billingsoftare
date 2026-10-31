"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clearBranchUnlock, createBranchUnlock, getSession } from "@/lib/auth";

/** Unlocks branch switching on this device with the owner password. */
export async function unlockBranchSwitch(password: string) {
  const session = await getSession();
  if (!session || session.role === "Cashier") return { error: "Not allowed" };

  const owner = await prisma.ownerAccount.findFirst();
  if (!owner) {
    return { error: "No owner password is set yet. Set it in Settings → Owner Password." };
  }
  const ok = typeof password === "string" && password.length > 0 && (await bcrypt.compare(password, owner.password));
  if (!ok) {
    // Slow down password guessing
    await new Promise((r) => setTimeout(r, 1000));
    return { error: "Wrong owner password" };
  }

  await createBranchUnlock(session.id, owner.updatedAt);
  revalidatePath("/", "layout");
  return { success: true };
}

/** Locks branch switching again. */
export async function lockBranchSwitch() {
  await clearBranchUnlock();
  revalidatePath("/", "layout");
  return { success: true };
}
