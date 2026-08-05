"use client";

import { Printer } from "lucide-react";
import { printBill } from "@/lib/qz-print";
import type { BillData } from "@/lib/print";

/** Reprints a saved invoice's customer bill through the same thermal-print
 *  pipeline (QZ Tray / native USB / RawBT / browser fallback) checkout uses —
 *  NOT window.print(), which has no 80mm page sizing and bypasses all of it. */
export function PrintButton({ bill }: { bill: BillData }) {
  return (
    <button
      onClick={() => printBill(bill)}
      className="btn btn-primary shadow-indigo-200 shadow-md print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print Receipt
    </button>
  );
}
