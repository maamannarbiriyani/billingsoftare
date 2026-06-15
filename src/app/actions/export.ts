"use server";

import { prisma } from "@/lib/prisma";

function csvField(value: string | number): string {
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportGSTReportCSV(startDate?: Date, endDate?: Date) {
  const whereClause = (startDate && endDate)
    ? { createdAt: { gte: startDate, lte: endDate } }
    : {};

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      order: true,
      items: {
        include: { product: true }
      }
    }
  });

  const headers = [
    "Invoice Number",
    "Date",
    "Customer",
    "Product Name",
    "HSN Code",
    "Quantity",
    "Unit",
    "Item Price (excl. GST)",
    "GST Rate (%)",
    "CGST Amount",
    "SGST Amount",
    "Total GST",
    "Item Total (incl. GST)",
    "Invoice Discount",
    "Invoice Total",
    "Payment Method",
    "Order Mode",
    "Invoice Status",
  ];

  const rows: string[] = [];
  // UTF-8 BOM for Excel compatibility
  rows.push("﻿" + headers.map(csvField).join(","));

  for (const inv of invoices) {
    const dateStr = new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const customerName = inv.customer?.name || "Walk-in";
    const paymentMethod = inv.paymentMethod || "Cash";
    const orderMode = inv.order?.source || "DINE_IN";

    for (const item of inv.items) {
      const gstRate = item.product.gstRate || 0;
      const itemSubtotal = parseFloat((item.qty * item.price).toFixed(2));
      const totalGst = parseFloat(((itemSubtotal * gstRate) / 100).toFixed(2));
      const cgst = parseFloat((totalGst / 2).toFixed(2));
      const sgst = parseFloat((totalGst - cgst).toFixed(2));
      const itemTotal = parseFloat((itemSubtotal + totalGst).toFixed(2));

      const row = [
        inv.invoiceNumber,
        dateStr,
        customerName,
        item.product.name,
        (item.product as any).hsnCode || "",
        item.qty,
        (item.product as any).unit || "pcs",
        item.price.toFixed(2),
        gstRate.toFixed(2),
        cgst.toFixed(2),
        sgst.toFixed(2),
        totalGst.toFixed(2),
        itemTotal.toFixed(2),
        inv.discountAmount.toFixed(2),
        inv.total.toFixed(2),
        paymentMethod,
        orderMode,
        inv.status,
      ];
      rows.push(row.map(csvField).join(","));
    }
  }

  return rows.join("\r\n");
}
