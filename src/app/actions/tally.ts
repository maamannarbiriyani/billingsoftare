"use server";

import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/auth";

export async function getTallyData(startDate: Date, endDate: Date) {
  const branchId = await getActiveBranchId();
  if (!branchId) return {
    totalRevenue: 0,
    revenueByCategory: {},
    totalExpense: 0,
    expenseByCategory: {},
    netProfit: 0,
    invoicesCount: 0,
    expensesCount: 0,
  };

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { branchId, createdAt: { gte: startDate, lte: endDate } },
      include: { items: { include: { product: true } }, order: true }
    }),
    prisma.expense.findMany({
      where: { branchId, date: { gte: startDate, lte: endDate } }
    })
  ]);

  // Aggregate Inflow
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const revenueByCategory = invoices.reduce((acc, inv) => {
    inv.items.forEach(item => {
      const cat = item.product.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + (item.qty * item.price);
    });
    return acc;
  }, {} as Record<string, number>);

  // Aggregate Outflow
  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const expenseByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const netProfit = totalRevenue - totalExpense;

  return {
    totalRevenue,
    revenueByCategory,
    totalExpense,
    expenseByCategory,
    netProfit,
    invoicesCount: invoices.length,
    expensesCount: expenses.length,
  };
}
