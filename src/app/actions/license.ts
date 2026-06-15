"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function activateLicense(formData: FormData) {
  const licenseKey = formData.get("licenseKey") as string;

  if (!licenseKey) {
    return { error: "Please enter a valid license key." };
  }

  try {
    // Ping the Cloud Admin Portal
    // (Assuming local dev is 3001 for Admin Portal, in prod this would be a real URL)
    const ADMIN_PORTAL_URL = process.env.ADMIN_PORTAL_URL || "http://localhost:3001";
    
    const res = await fetch(`${ADMIN_PORTAL_URL}/api/v1/licenses/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey })
    });

    const data = await res.json();

    if (!res.ok || !data.valid) {
      return { error: data.reason || "Invalid license key. Please check and try again." };
    }

    const expiry = new Date(data.expiry);
    const existing = await prisma.setting.findFirst();

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: {
          licenseKey,
          licenseExpiry: expiry,
        },
      });
    } else {
      await prisma.setting.create({
        data: {
          licenseKey,
          licenseExpiry: expiry,
          storeName: data.clientName || "My Retail Store",
        },
      });
    }

    revalidatePath("/", "layout"); 
    return { success: true };
  } catch (error) {
    console.error("License Activation Error:", error);
    return { error: "Could not connect to the license server. Please check your internet connection." };
  }
}
