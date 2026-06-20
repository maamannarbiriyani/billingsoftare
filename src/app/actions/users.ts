"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getSession, getActiveBranchId } from "@/lib/auth";

// Check if the current user is an Admin
async function isAdmin() {
  const session = await getSession();
  return session?.role === "Admin";
}

export async function getUsers() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  
  const branchId = await getActiveBranchId();
  if (!branchId) return [];

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { branchId },
        { branchId: null } // Include global admins
      ]
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
    orderBy: {
      id: "asc",
    },
  });
  return users;
}

export async function createUser(formData: FormData) {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!username || !password || !role) {
    return { error: "All fields are required" };
  }

  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { error: "Username already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        branchId: role === "Admin" ? null : branchId, // Admins are global, Cashiers are branch-specific
      },
    });

    revalidatePath("/settings/users");
    return { success: true };
  } catch (error) {
    console.error("Create User Error:", error);
    return { error: "Failed to create user" };
  }
}

export async function deleteUser(id: number) {
  if (!(await isAdmin())) return { error: "Unauthorized" };
  
  const branchId = await getActiveBranchId();

  try {
    // Prevent deleting the last admin
    const adminCount = await prisma.user.count({
      where: { role: "Admin" },
    });
    
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    
    if (userToDelete?.role === "Admin" && adminCount <= 1) {
      return { error: "Cannot delete the last admin account." };
    }
    
    if (userToDelete?.role !== "Admin" && userToDelete?.branchId !== branchId) {
      return { error: "User does not belong to the active branch" };
    }

    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/settings/users");
    return { success: true };
  } catch (error) {
    console.error("Delete User Error:", error);
    return { error: "Failed to delete user" };
  }
}
