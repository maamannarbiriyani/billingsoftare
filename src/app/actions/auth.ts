"use server";

import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { username },
    });
  } catch (error: any) {
    console.error("Login DB Error:", error);
    return { error: "Database connection failed. Please check Vercel Environment Variables." };
  }

  if (!user) {
    return { error: "Invalid username or password" };
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return { error: "Invalid username or password" };
  }

  // Create session
  const session = await encrypt({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
