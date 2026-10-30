import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { AutoPrint } from "@/components/AutoPrint";
import { BackButton } from "@/components/BackButton";
import { Printer, UtensilsCrossed } from "lucide-react";
import { ReturnModal } from "./ReturnModal";
import { KitchenCopyButton } from "./KitchenCopyButton";
import { EditInvoiceModal } from "./EditInvoiceModal";
import { DeleteInvoiceButton } from "./DeleteInvoiceButton";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { getReceiptTemplateForBranch } from "@/lib/receipt-template-server";
import type { BillData } from "@/lib/print";

export default async function InvoiceReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const [resolvedParams, resolvedSearch] = await Promise.all([params, searchParams]);
  const invoiceId = parseInt(resolvedParams.id, 10);
  const autoPrint = resolvedSearch?.autoprint === "1";
  if (isNaN(invoiceId)) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      order: { select: { source: true, table: { select: { name: true } } } },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  // The branch that made this bill: its shop details and Bill Design template
  const [setting, template] = await Promise.all([
    (invoice.branchId
      ? prisma.setting.findFirst({ where: { branchId: invoice.branchId } })
      : Promise.resolve(null)
    ).then((s) => s || prisma.setting.findFirst()),
    getReceiptTemplateForBranch(invoice.branchId),
  ]);

  const bill: BillData = {
    storeName: setting?.storeName || "Billing System",
    phone: setting?.phone,
    address: setting?.address,
    gstNumber: setting?.gstNumber,
    logoUrl: "/billlogo.png",
    invoiceNumber: invoice.invoiceNumber,
    dailyNo: invoice.dailyNo,
    orderMode: invoice.order?.source || null,
    date: invoice.createdAt,
    customerName: invoice.customer?.name || invoice.customerName,
    cashierName: invoice.cashierName,
    tableName: invoice.order?.table?.name || null,
    paymentMethod: invoice.paymentMethod,
    items: invoice.items.map((it) => ({
      name: it.product.name,
      price: it.price,
      qty: it.qty,
      hsn: it.product.hsnCode,
    })),
    subtotal: invoice.subtotal ?? invoice.total,
    gstAmount: invoice.gstAmount,
    discountAmount: invoice.discountAmount,
    total: invoice.total,
    template,
  };

  return (
    <div className="flex flex-col items-center pb-20 print:block print:pb-0 print:m-0 print:p-0 w-full animate-fade-in">
      {/* Auto-print customer bill when coming from dual-print checkout */}
      {autoPrint && <AutoPrint />}

      {/* ── Screen Only Action Bar ── */}
      <div className="w-full max-w-2xl mb-6 flex justify-between items-center print:hidden bg-card p-4 rounded-2xl border border-border shadow-sm gap-3">
        <BackButton fallback="/invoices" className="btn btn-ghost btn-sm flex-shrink-0" />

        <div className="flex gap-2 items-center flex-wrap">
          <EditInvoiceModal invoice={invoice} />
          <ReturnModal invoice={invoice} />
          <KitchenCopyButton invoice={invoice} />
          <PrintButton bill={bill} />
          <DeleteInvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
        </div>
      </div>

      {/* ── Screen: A4-style preview wrapper ── */}
      <div className="w-full max-w-2xl print:max-w-none print:w-auto print:shadow-none">

        {/* Receipt card — same renderer as the printed bill (Bill Design template) */}
        <div className="bg-card rounded-2xl shadow-xl border border-border print:shadow-none print:border-none print:rounded-none print:bg-white mx-auto print:mx-0 py-4 print:p-0 overflow-hidden" style={{ maxWidth: "100%" }}>
          <ReceiptPreview bill={bill} />
        </div>{/* end receipt card */}

        <div className="mt-4 text-center text-xs font-medium text-muted-foreground print:hidden flex items-center justify-center gap-2">
          <Printer className="h-3.5 w-3.5" />
          Optimized for 80mm (3-inch) thermal paper · <span className="flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" /> Kitchen Copy prints on kitchen printer</span>
        </div>
      </div>
    </div>
  );
}
