import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { AutoPrint } from "@/components/AutoPrint";
import Link from "next/link";
import { ArrowLeft, Printer, UtensilsCrossed } from "lucide-react";
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
        <Link href="/billing" className="btn btn-ghost btn-sm flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex gap-2 items-center flex-wrap">
          <EditInvoiceModal invoice={invoice} />
          <ReturnModal invoice={invoice} />
          <KitchenCopyButton invoice={invoice} storeName={storeName} />
          <PrintButton />
          <DeleteInvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
        </div>
      </div>

      {/* ── Screen: A4-style preview wrapper ── */}
      <div className="w-full max-w-2xl print:max-w-none print:w-auto print:shadow-none">

        {/* Receipt card — wide on screen, 80mm on print */}
        <div className="bg-card text-foreground rounded-2xl shadow-xl border border-border print:shadow-none print:border-none print:rounded-none print:bg-white print:text-black mx-auto print:mx-0 print:p-0 overflow-hidden" style={{ maxWidth: "100%" }}>

          {/* ── Print-only narrow wrapper (80mm) ── */}
          <div className="print:max-w-[80mm] print:w-[80mm] print:mx-auto print:font-mono print:text-[12px]">

            {/* ── Header band (screen decorative) ── */}
            <div className="px-8 py-6 border-b border-border print:px-3 print:py-4 print:border-dashed" style={{ background: "var(--muted)" }}>
              <div className="text-center">
                <h1 className="text-3xl font-black uppercase tracking-widest leading-none text-foreground print:text-xl print:text-black">
                  {storeName}
                </h1>
                {address && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-snug mt-2 px-6 print:text-[11px] print:px-2 print:text-black">
                    {address}
                  </p>
                )}
                {gstNumber && (
                  <p className="text-sm font-bold text-muted-foreground print:text-[11px] print:text-black mt-1">
                    GSTIN: {gstNumber}
                  </p>
                )}
              </div>
            </div>

            {/* ── Invoice meta ── */}
            <div className="px-8 py-5 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-border print:px-3 print:py-3 print:grid-cols-1 print:gap-1 print:border-dashed">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground print:text-[9px]">Invoice No</p>
                <p className="text-base font-bold text-foreground mt-0.5 print:text-sm print:text-black">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground print:text-[9px]">Date & Time</p>
                <p className="text-base font-semibold text-foreground mt-0.5 print:text-sm print:text-black">
                  {invoice.createdAt.toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground print:text-[9px]">Payment</p>
                <p className="text-base font-bold text-foreground mt-0.5 print:text-sm print:text-black uppercase">
                  {invoice.paymentMethod || "CASH"}
                </p>
              </div>
              {invoice.cashierName && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground print:text-[9px]">Cashier</p>
                  <p className="text-base font-semibold text-foreground mt-0.5 print:text-sm print:text-black">{invoice.cashierName}</p>
                </div>
              )}
              {invoice.customer && (
                <>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground print:text-[9px]">Customer</p>
                    <p className="text-base font-bold text-foreground mt-0.5 print:text-sm print:text-black">{invoice.customer.name}</p>
                  </div>
                  {invoice.customer.phone && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground print:text-[9px]">Phone</p>
                      <p className="text-base font-semibold text-foreground mt-0.5 print:text-sm print:text-black">{invoice.customer.phone}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Items Table ── */}
            <div className="px-8 py-5 print:px-3 print:py-3">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-border print:border-dashed print:border-black">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-[10px] print:text-black print:pb-1.5">Item</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center print:text-[10px] print:text-black print:pb-1.5 w-16">Qty</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right print:text-[10px] print:text-black print:pb-1.5 w-24">Rate</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right print:text-[10px] print:text-black print:pb-1.5 w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-dashed border-border print:border-black">
                      <td className="py-3.5 pr-3 align-top print:py-2">
                        <div className="font-bold text-sm text-foreground leading-tight print:text-[12px] print:text-black">
                          {item.product.name}
                        </div>
                        {item.product.hsnCode && (
                          <div className="text-xs text-muted-foreground mt-0.5 print:text-[9px] print:text-black">
                            HSN: {item.product.hsnCode}
                          </div>
                        )}
                        {item.returnedQty > 0 && (
                          <span className="text-xs text-rose-500 mt-0.5 block print:text-[10px]">
                            (-{item.returnedQty} returned)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-center align-top font-semibold text-sm text-foreground print:py-2 print:text-[12px] print:text-black">
                        {item.qty}
                      </td>
                      <td className="py-3.5 text-right align-top text-sm text-muted-foreground print:py-2 print:text-[12px] print:text-black">
                        ₹{item.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right align-top font-bold text-sm text-foreground print:py-2 print:text-[12px] print:text-black">
                        ₹{(item.price * item.qty).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals ── */}
            <div className="px-8 pb-6 print:px-3 print:pb-4">
              <div className="border-t border-border pt-4 space-y-2.5 print:border-dashed print:border-black print:pt-2 print:space-y-1.5">

                <div className="flex justify-between text-sm text-muted-foreground print:text-[11px] print:text-black">
                  <span>Subtotal (Taxable)</span>
                  <span className="font-semibold">₹{(invoice.subtotal ?? invoice.total).toFixed(2)}</span>
                </div>

                {gst > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground print:text-[11px] print:text-black">
                      <span>CGST ({(invoice.gstRate / 2).toFixed(1)}%)</span>
                      <span className="font-semibold">+ ₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground print:text-[11px] print:text-black">
                      <span>SGST ({(invoice.gstRate / 2).toFixed(1)}%)</span>
                      <span className="font-semibold">+ ₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {(invoice.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 print:text-black print:text-[11px]">
                    <span>Discount</span>
                    <span className="font-semibold">- ₹{invoice.discountAmount?.toFixed(2)}</span>
                  </div>
                )}

                {roundOff !== 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground print:text-[11px] print:text-black">
                    <span>Round Off</span>
                    <span className="font-semibold">{roundOff > 0 ? "+" : ""}₹{roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t-2 border-foreground print:border-black mt-2 pt-3 print:mt-1 print:pt-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-black uppercase tracking-wider text-foreground print:text-base print:text-black">TOTAL</span>
                    <span className="text-3xl font-black text-foreground print:text-xl print:text-black">₹{roundedTotal.toFixed(2)}</span>
                  </div>
                </div>

                {(invoice.status === "REFUNDED" || invoice.status === "PARTIAL_REFUND") && (
                  <div className="flex justify-between items-center mt-3 text-rose-600 font-bold border border-rose-200 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 rounded-lg print:border print:px-2 print:py-1">
                    <span className="text-xs uppercase tracking-wider print:text-[10px]">Status</span>
                    <span className="uppercase text-sm print:text-[12px]">{invoice.status.replace("_", " ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="text-center py-5 px-8 border-t border-dashed border-border print:border-black print:px-3 print:py-3">
              <p className="font-bold text-sm text-foreground print:text-[12px] print:text-black">Thank you for your business!</p>
              <p className="text-xs text-muted-foreground mt-1 print:text-[10px] print:text-black">Please keep this receipt for your records.</p>
              {gstNumber && (
                <p className="text-xs text-muted-foreground mt-1 print:text-[10px] print:text-black">GSTIN: {gstNumber}</p>
              )}
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
