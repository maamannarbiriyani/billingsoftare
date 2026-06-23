"use client";

import { UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

type Item = { product: { name: string }; qty: number };

export function KitchenCopyButton({
  invoice,
  storeName,
}: {
  invoice: {
    invoiceNumber: string;
    paymentMethod: string | null;
    items: Item[];
    customer?: { name: string } | null;
    customerName?: string | null;
  };
  storeName: string;
}) {
  const handlePrint = () => {
    const rows = invoice.items
      .map(i => `<tr><td class="qty">${i.qty}×</td><td class="name">${i.product.name.toUpperCase()}</td></tr>`)
      .join("");

    const win = window.open("", "_blank", "width=360,height=640,toolbar=0,scrollbars=0,status=0,menubar=0");
    if (!win) {
      toast.warning("⚠️ Popup blocked! Allow popups to print kitchen copy.");
      return;
    }

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kitchen Copy</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:80mm;padding:6px 8px;font-size:14px;background:#fff;color:#000}
  @page{margin:0;size:80mm auto}
  h1{text-align:center;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin-bottom:2px}
  .sub{text-align:center;font-size:11px;letter-spacing:1px;margin-bottom:6px}
  .meta{text-align:center;font-size:12px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px dashed #000}
  .badge{display:inline-block;background:#000;color:#fff;padding:2px 8px;font-size:10px;font-weight:900;letter-spacing:2px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  thead tr{border-bottom:2px solid #000}
  th{font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:3px 0;text-align:left}
  td{padding:6px 0;border-bottom:1px dashed #888;vertical-align:top;font-weight:bold}
  .qty{width:32px;font-size:16px;font-weight:900}
  .name{font-size:15px;padding-left:4px;line-height:1.3}
  .footer{text-align:center;font-size:11px;margin-top:8px;padding-top:6px;border-top:2px dashed #000;font-weight:bold;letter-spacing:2px}
</style></head><body>
<h1>KOT</h1>
<div class="sub">Kitchen Order Ticket</div>
<div class="meta">
  <strong>${invoice.invoiceNumber}</strong><br>
  ${(invoice.customer?.name || invoice.customerName) ? `Customer: <strong>${invoice.customer?.name || invoice.customerName}</strong><br>` : ""}
  ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
</div>
<table>
  <thead><tr><th>Qty</th><th>Item</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">*** END KOT ***</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 450);
  };

  return (
    <button onClick={handlePrint} className="btn btn-secondary btn-sm flex items-center gap-1.5">
      <UtensilsCrossed className="h-4 w-4" />
      Kitchen Copy
    </button>
  );
}
