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

  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
    prisma.setting.findFirst(),
  ]);

  if (!invoice) {
    notFound();
  }

  const storeName = setting?.storeName || "Billing System";
  const phone = setting?.phone;
  const gstNumber = setting?.gstNumber;
  const address = setting?.address;

  const gst = invoice.gstAmount ?? 0;
  const cgst = parseFloat((gst / 2).toFixed(2));
  const sgst = parseFloat((gst - cgst).toFixed(2));
  const beforeRounding = parseFloat((invoice.total).toFixed(2));
  const roundedTotal = Math.round(beforeRounding);
  const roundOff = parseFloat((roundedTotal - beforeRounding).toFixed(2));

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
          <PrintButton />
          <DeleteInvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
        </div>
      </div>

      {/* ── Screen: A4-style preview wrapper ── */}
      <div className="w-full max-w-2xl print:max-w-none print:w-auto print:shadow-none">

        {/* Receipt card — wide on screen, 80mm on print */}
        <div className="bg-card text-foreground rounded-2xl shadow-xl border border-border print:shadow-none print:border-none print:rounded-none print:bg-white print:text-black mx-auto print:mx-0 print:p-0 overflow-hidden" style={{ maxWidth: "100%" }}>

          {/* ── 80mm Receipt Wrapper (Preview & Print) ── */}
          <div className="max-w-[300px] w-full mx-auto font-mono text-[12px] leading-snug text-black bg-white p-4 print:p-0">
            
            {/* ── Logo ── */}
            <div className="flex justify-center pt-2 pb-1">
              <img src="/billlogo.png" alt="Logo" className="w-[60mm] object-contain grayscale print:grayscale" />
            </div>

            {/* ── Header ── */}
            <div className="text-center pb-2">
              <h1 className="text-[14px] font-bold">{storeName}</h1>
              {phone && <p className="text-[12px]">Ph: {phone}</p>}
              {address && (
                <p className="text-[11px] leading-tight mt-0.5 mx-auto max-w-[70mm]">
                  {address}
                </p>
              )}
              {gstNumber && <p className="text-[11px] mt-0.5">GSTIN: {gstNumber}</p>}
            </div>

            {/* ── Meta ── */}
            <div className="text-left px-1 pb-1">
              <p className="text-[12px]">{invoice.createdAt.toLocaleString("en-IN", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: false
                  }).replace(",", "")}</p>
              <p className="text-[12px]">Bill No:{invoice.invoiceNumber}</p>
              {(invoice.customer?.name || invoice.customerName) && (
                <p className="text-[12px] font-bold mt-1">
                  Customer: {invoice.customer?.name || invoice.customerName}
                </p>
              )}
            </div>

            {/* ── Table Header ── */}
            <div className="border-b border-black mb-1"></div>
            <table className="w-full text-left table-fixed">
              <thead>
                <tr>
                  <th className="font-normal text-[11px] w-[35mm] uppercase tracking-tighter">ITEM</th>
                  <th className="font-normal text-[11px] w-[15mm] text-right uppercase tracking-tighter">BASE PRICE</th>
                  <th className="font-normal text-[11px] w-[8mm] text-center uppercase tracking-tighter">QTY</th>
                  <th className="font-normal text-[11px] w-[20mm] text-right uppercase tracking-tighter">T.VALUE</th>
                </tr>
              </thead>
            </table>
            <div className="border-b border-black mt-1 mb-1"></div>

            {/* ── Table Body ── */}
            <table className="w-full text-left table-fixed">
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="align-top text-[12px] w-[35mm] pr-1 truncate">{item.product.name}</td>
                    <td className="align-top text-[12px] w-[15mm] text-right">{item.price.toFixed(2)}</td>
                    <td className="align-top text-[12px] w-[8mm] text-center">{item.qty}</td>
                    <td className="align-top text-[12px] w-[20mm] text-right">{(item.price * item.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-black mt-1 mb-1"></div>

            {/* ── Totals ── */}
            <div className="flex flex-col items-end px-1 pt-1 pb-2">
              <div className="flex justify-end gap-2 text-[12px] w-full">
                <span className="w-24 text-right">Sub Total:</span>
                <span className="w-[20mm] text-right">{(invoice.subtotal ?? invoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-2 text-[13px] w-full mt-0.5">
                <span className="w-24 text-right">Grand Total:</span>
                <span className="w-[20mm] text-right">{roundedTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* ── Payment Info ── */}
            <div className="text-left px-1 text-[12px] space-y-0 pb-1">
              <p>Tender: {roundedTotal.toFixed(2)}</p>
              <p>Change: 0.00</p>
              <p>Payment Mode: {invoice.paymentMethod || "Cash"}</p>
            </div>

            <div className="border-b border-black mt-1 mb-2"></div>

            {/* ── Footer ── */}
            <div className="text-center pb-4">
              <p className="text-[12px]">Thank You! Visit Again!!</p>
            </div>

          </div>{/* end print-narrow wrapper */}
        </div>{/* end receipt card */}

        <div className="mt-4 text-center text-xs font-medium text-muted-foreground print:hidden flex items-center justify-center gap-2">
          <Printer className="h-3.5 w-3.5" />
          Optimized for 80mm (3-inch) thermal paper · <span className="flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" /> Kitchen Copy prints on kitchen printer</span>
        </div>
      </div>
    </div>
  );
}
