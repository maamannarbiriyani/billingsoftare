"use server";

import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/auth";

export type AppNotification = {
  id: string;
  type: "stock" | "khata" | "purchase" | "online" | "shift";
  severity: "danger" | "warning" | "info";
  title: string;
  description: string;
  href: string;
};

const LOW_STOCK_THRESHOLD = 10;

export async function getNotifications(): Promise<AppNotification[]> {
  const branchId = await getActiveBranchId();
  const bf = branchId ? { branchId } : {};

  try {
    const [lowStock, khataAgg, unpaidPurchases, onlineOrders, openShift] = await Promise.all([
      prisma.product.findMany({
        where: { ...bf, isActive: true, stock: { lt: LOW_STOCK_THRESHOLD, not: 999999 } },
        select: { id: true, name: true, stock: true, unit: true },
        orderBy: { stock: "asc" },
        take: 8,
      }),
      prisma.customer.aggregate({
        where: { ...bf, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: true,
      }),
      prisma.purchaseInvoice.count({ where: { ...bf, status: "UNPAID" } }),
      prisma.order.count({
        where: { ...bf, status: "RECEIVED", source: { in: ["SWIGGY", "ZOMATO"] } },
      }),
      prisma.shift.findFirst({ where: { ...bf, status: "OPEN" }, select: { id: true } }),
    ]);

    const notes: AppNotification[] = [];

    // New online orders (most time-sensitive → first)
    if (onlineOrders > 0) {
      notes.push({
        id: "online-orders",
        type: "online",
        severity: "info",
        title: `${onlineOrders} new online order${onlineOrders > 1 ? "s" : ""}`,
        description: "Swiggy / Zomato orders waiting to be accepted.",
        href: "/billing",
      });
    }

    // Unpaid purchase invoices
    if (unpaidPurchases > 0) {
      notes.push({
        id: "purchases-unpaid",
        type: "purchase",
        severity: "danger",
        title: `${unpaidPurchases} unpaid purchase invoice${unpaidPurchases > 1 ? "s" : ""}`,
        description: "Supplier bills pending payment.",
        href: "/purchases",
      });
    }

    // Khata / credit outstanding
    const khataTotal = khataAgg._sum.balance || 0;
    if (khataAgg._count > 0 && khataTotal > 0) {
      notes.push({
        id: "khata-outstanding",
        type: "khata",
        severity: "warning",
        title: `₹${khataTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })} in Khata dues`,
        description: `${khataAgg._count} customer${khataAgg._count > 1 ? "s have" : " has"} outstanding credit.`,
        href: "/customers",
      });
    }

    // Low stock — one entry per product
    for (const p of lowStock) {
      notes.push({
        id: `stock-${p.id}`,
        type: "stock",
        severity: p.stock <= 0 ? "danger" : "warning",
        title: p.stock <= 0 ? `${p.name} is out of stock` : `${p.name} low on stock`,
        description: `${p.stock} ${p.unit || "pcs"} remaining.`,
        href: "/inventory",
      });
    }

    // No open shift reminder (only if there is some activity context)
    if (!openShift) {
      notes.push({
        id: "shift-closed",
        type: "shift",
        severity: "info",
        title: "No cash shift is open",
        description: "Open a shift to track cash sales accurately.",
        href: "/shifts",
      });
    }

    return notes;
  } catch (error) {
    console.error("getNotifications error:", error);
    return [];
  }
}
