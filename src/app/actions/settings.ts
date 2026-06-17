"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  const storeName = formData.get("storeName") as string;
  const phone = formData.get("phone") as string;
  const gstNumber = formData.get("gstNumber") as string;
  const address = formData.get("address") as string;
  const printerName = formData.get("printerName") as string;

  if (!storeName) {
    return { error: "Store Name is required" };
  }

  try {
    const existing = await prisma.setting.findFirst();

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: {
          storeName,
          phone,
          gstNumber,
          address,
          printerName,
        },
      });
    } else {
      await prisma.setting.create({
        data: {
          storeName,
          phone,
          gstNumber,
          address,
          printerName,
        },
      });
    }

    revalidatePath("/settings");
    revalidatePath("/invoices/[id]");

    return { success: true };
  } catch (error) {
    console.error("Settings Error:", error);
    return { error: "Failed to update settings" };
  }
}
