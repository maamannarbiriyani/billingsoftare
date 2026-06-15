"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEmployees() {
  return prisma.employee.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createEmployee(data: { name: string; role: string; phone?: string; dailyWage: number }) {
  try {
    await prisma.employee.create({
      data: {
        name: data.name,
        role: data.role || "Staff",
        phone: data.phone,
        dailyWage: data.dailyWage,
      },
    });
    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { error: "Failed to create employee" };
  }
}

export async function updateEmployee(id: number, data: { name: string; role: string; phone?: string; dailyWage: number; status: string }) {
  try {
    await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone,
        dailyWage: data.dailyWage,
        status: data.status,
      },
    });
    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { error: "Failed to update employee" };
  }
}

export async function deleteEmployee(id: number) {
  try {
    await prisma.employee.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return { error: "Failed to remove employee" };
  }
}

export async function getAttendancesByDate(date: Date) {
  // normalize date to start of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.attendance.findMany({
    where: { date: startOfDay },
  });
}

export async function markAttendance(employeeId: number, date: Date, status: "PRESENT" | "HALF_DAY" | "ABSENT") {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { error: "Employee not found" };

    let calculatedWage = 0;
    if (status === "PRESENT") calculatedWage = employee.dailyWage;
    else if (status === "HALF_DAY") calculatedWage = employee.dailyWage / 2;

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: startOfDay,
        },
      },
      update: {
        status,
        calculatedWage,
      },
      create: {
        employeeId,
        date: startOfDay,
        status,
        calculatedWage,
      },
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark attendance:", error);
    return { error: "Failed to mark attendance" };
  }
}

export async function getSalarySummary() {
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    include: {
      attendances: true,
      payouts: true,
    },
    orderBy: { name: "asc" },
  });

  return employees.map((emp) => {
    const totalEarned = emp.attendances.reduce((sum, att) => sum + att.calculatedWage, 0);
    const totalAdvanced = emp.payouts
      .filter((p) => p.notes?.startsWith("Wage Advance"))
      .reduce((sum, pay) => sum + pay.amount, 0);
    const totalPaid = emp.payouts.reduce((sum, pay) => sum + pay.amount, 0);
    const pendingBalance = totalEarned - totalPaid;

    return {
      ...emp,
      totalEarned,
      totalAdvanced,
      totalPaid,
      pendingBalance,
    };
  });
}

export async function paySalary(employeeId: number, amount: number, month: string, notes?: string) {
  try {
    if (amount <= 0) return { error: "Amount must be greater than 0" };

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { error: "Employee not found" };

    await prisma.$transaction(async (tx) => {
      // Create payout record
      await tx.salaryPayout.create({
        data: {
          employeeId,
          amount,
          month,
          notes,
        },
      });

      // Create an expense record for the tally
      await tx.expense.create({
        data: {
          amount,
          description: `Salary Payout - ${employee.name} (${month})`,
          category: "Staff Salary",
          date: new Date(),
        },
      });
    });

    revalidatePath("/staff");
    revalidatePath("/tally");
    return { success: true };
  } catch (error) {
    console.error("Failed to pay salary:", error);
    return { error: "Failed to process payout" };
  }
}
