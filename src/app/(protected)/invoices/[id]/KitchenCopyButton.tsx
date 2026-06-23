"use client";

import { UtensilsCrossed } from "lucide-react";
import { printReceipt, buildKotHtml } from "@/lib/print";

type Item = { product: { name: string }; qty: number };

export function KitchenCopyButton({
  invoice,
}: {
  invoice: {
    invoiceNumber: string;
    paymentMethod: string | null;
    items: Item[];
    customer?: { name: string } | null;
    customerName?: string | null;
  };
  storeName?: string;
}) {
  const handlePrint = () => {
    printReceipt(buildKotHtml({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name || invoice.customerName,
      items: invoice.items.map(i => ({ name: i.product.name, qty: i.qty })),
    }));
  };

  return (
    <button onClick={handlePrint} className="btn btn-secondary btn-sm flex items-center gap-1.5">
      <UtensilsCrossed className="h-4 w-4" />
      Kitchen Copy
    </button>
  );
}
