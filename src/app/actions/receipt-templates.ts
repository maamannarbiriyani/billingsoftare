"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession, getActiveBranchId, isBranchUnlocked } from "@/lib/auth";
import {
  DEFAULT_RECEIPT_CONFIG,
  MAX_LOGO_BYTES,
  normalizeReceiptConfig,
  type ReceiptConfig,
} from "@/lib/receipt-template";

async function isAdmin() {
  const session = await getSession();
  return session?.role === "Admin";
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/billing");
  revalidatePath("/invoices/[id]", "page");
}

async function nextTemplateName() {
  const names = new Set((await prisma.receiptTemplate.findMany({ select: { name: true } })).map((t) => t.name));
  let n = names.size + 1;
  while (names.has(`Template ${n}`)) n++;
  return `Template ${n}`;
}

/** New template — a copy of `copyFromId`, or the classic layout. */
export async function createReceiptTemplate(copyFromId?: number) {
  if (!(await isAdmin())) return { error: "Only an admin can change the bill design" };
  try {
    const source = copyFromId ? await prisma.receiptTemplate.findUnique({ where: { id: copyFromId } }) : null;
    const created = await prisma.receiptTemplate.create({
      data: {
        name: await nextTemplateName(),
        config: source?.config ?? JSON.stringify(DEFAULT_RECEIPT_CONFIG),
        logo: source?.logo ?? null,
      },
    });
    refresh();
    return { success: true, id: created.id, name: created.name };
  } catch (e) {
    console.error("Create receipt template failed", e);
    return { error: "Could not create the template" };
  }
}

/** `logo`: a data URL to set, null to remove, undefined to keep as is. */
export async function saveReceiptTemplate(
  id: number,
  data: { name: string; config: ReceiptConfig; logo?: string | null },
) {
  if (!(await isAdmin())) return { error: "Only an admin can change the bill design" };
  const name = data.name.trim().slice(0, 40);
  if (!name) return { error: "Template name is required" };
  if (typeof data.logo === "string") {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(data.logo)) return { error: "Logo must be a PNG or JPG image" };
    if (data.logo.length > MAX_LOGO_BYTES) return { error: "Logo is too large — use a smaller image" };
  }
  try {
    await prisma.receiptTemplate.update({
      where: { id },
      data: {
        name,
        config: JSON.stringify(normalizeReceiptConfig(data.config)),
        ...(data.logo !== undefined ? { logo: data.logo } : {}),
      },
    });
    refresh();
    return { success: true };
  } catch (e) {
    console.error("Save receipt template failed", e);
    return { error: "Could not save the template" };
  }
}

export async function deleteReceiptTemplate(id: number) {
  if (!(await isAdmin())) return { error: "Only an admin can change the bill design" };
  try {
    if ((await prisma.receiptTemplate.count()) <= 1) return { error: "You need at least one template" };
    // Branches that used it fall back to the first template
    await prisma.branchReceiptTemplate.deleteMany({ where: { templateId: id } });
    await prisma.receiptTemplate.delete({ where: { id } });
    refresh();
    return { success: true };
  } catch (e) {
    console.error("Delete receipt template failed", e);
    return { error: "Could not delete the template" };
  }
}

/** templateId null = the branch uses the first template. */
export async function assignReceiptTemplate(branchId: number, templateId: number | null) {
  if (!(await isAdmin())) return { error: "Only an admin can change the bill design" };
  // Another branch is owner business: needs the owner unlock
  if (branchId !== (await getActiveBranchId()) && !(await isBranchUnlocked(await getSession()))) {
    return { error: "Unlock with the owner password to change another branch" };
  }
  try {
    if (templateId === null) {
      await prisma.branchReceiptTemplate.deleteMany({ where: { branchId } });
    } else {
      await prisma.branchReceiptTemplate.upsert({
        where: { branchId },
        create: { branchId, templateId },
        update: { templateId },
      });
    }
    refresh();
    return { success: true };
  } catch (e) {
    console.error("Assign receipt template failed", e);
    return { error: "Could not assign the template" };
  }
}
