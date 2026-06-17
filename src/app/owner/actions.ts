"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createOwnerSession, clearOwnerSession } from "@/lib/owner-auth";
import { redirect } from "next/navigation";

export async function ownerLogin(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  const account = await prisma.ownerAccount.findUnique({ where: { username } });
  if (!account) {
    return { error: "Invalid username or password" };
  }

  const valid = await bcrypt.compare(password, account.password);
  if (!valid) {
    return { error: "Invalid username or password" };
  }

  await createOwnerSession(username);
  redirect("/owner");
}

export async function ownerLogout() {
  await clearOwnerSession();
  redirect("/owner/login");
}
