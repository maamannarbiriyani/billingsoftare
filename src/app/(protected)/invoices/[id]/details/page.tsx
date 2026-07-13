import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  User,
  Phone,
  Calendar,
  CreditCard,
  ReceiptText,
  Tag,
  RotateCcw,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Paid / Settled", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  PARTIAL_REFUND: { label: "Partial Refund", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  REFUNDED: { label: "Refunded / Void", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
};

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true, category: true } } } },
    },
  });

  if (!invoice) notFound();

  const gst = invoice.gstAmount ?? 0;
  const cgst = parseFloat((gst / 2).toFixed(2));
  const sgst = parseFloat((gst - cgst).toFixed(2));
  const discount = invoice.discountAmount ?? 0;
  const subtotal = invoice.subtotal ?? invoice.total;
  const beforeRounding = parseFloat(invoice.total.toFixed(2));
  const roundedTotal = Math.round(beforeRounding);
  const roundOff = parseFloat((roundedTotal - beforeRounding).toFixed(2));

  const customerName = invoice.customer?.name || invoice.customerName;
  const customerPhone = invoice.customer?.phone || invoice.customerPhone;
  const status = STATUS[invoice.status] ?? { label: invoice.status, cls: "bg-muted text-muted-foreground" };

  const totalUnits = invoice.items.reduce((s, it) => s + it.qty, 0);
  const hasReturns = invoice.items.some((it) => (it.returnedQty ?? 0) > 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-16 animate-fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <BackButton fallback="/reports" />
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground shadow-sm active:opacity-80 transition-opacity"
        >
          <Printer className="h-4 w-4" />
          Print Bill
        </Link>
      </div>

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bill Number
            </p>
            <h1 className="mt-0.5 font-mono text-2xl font-extrabold tracking-tight text-foreground break-all">
              {invoice.invoiceNumber}
            </h1>
          </div>
          <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold ${status.cls}`}>
            {status.label}
          </span>
        </div>

        {/* Grand total highlight */}
        <div className="mt-4 flex items-end justify-between rounded-xl bg-muted/50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Grand Total
            </p>
            <p className="mt-0.5 text-3xl font-black text-foreground">₹{fmt(roundedTotal)}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="flex items-center justify-end gap-1">
              <ReceiptText className="h-3.5 w-3.5" />
              {invoice.items.length} item{invoice.items.length !== 1 ? "s" : ""} · {totalUnits} qty
            </p>
          </div>
        </div>
      </div>

      {/* ── Meta card ── */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2">
        <MetaRow
          icon={<Calendar className="h-4 w-4 text-blue-500" />}
          label="Bill Date & Time"
          value={invoice.createdAt.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })}
        />
        <MetaRow
          icon={<CreditCard className="h-4 w-4 text-violet-500" />}
          label="Payment Mode"
          value={invoice.paymentMethod || "Cash"}
        />
        <MetaRow
          icon={<User className="h-4 w-4 text-sky-500" />}
          label="Customer"
          value={customerName || "Walk-in"}
        />
        <MetaRow
          icon={<Phone className="h-4 w-4 text-emerald-500" />}
          label="Phone"
          value={customerPhone || "—"}
        />
        {invoice.cashierName && (
          <MetaRow
            icon={<User className="h-4 w-4 text-amber-500" />}
            label="Billed By"
            value={invoice.cashierName}
          />
        )}
      </div>

      {/* ── Items ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Tag className="h-4 w-4 text-primary" />
            Items Ordered
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {invoice.items.map((it) => {
            const lineTotal = it.price * it.qty;
            const returned = it.returnedQty ?? 0;
            return (
              <li key={it.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{it.product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {it.product.category && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                          {it.product.category}
                        </span>
                      )}
                      <span>
                        ₹{fmt(it.price)} × {it.qty}
                      </span>
                      {returned > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                          <RotateCcw className="h-3 w-3" />
                          {returned} returned
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="flex-shrink-0 font-bold text-foreground">₹{fmt(lineTotal)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Bill summary ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-foreground">Bill Summary</h2>
        </div>
        <div className="space-y-2.5 px-5 py-4 text-sm">
          <SummaryRow label="Sub Total" value={`₹${fmt(subtotal)}`} />
          {discount > 0 && (
            <SummaryRow label="Discount" value={`– ₹${fmt(discount)}`} valueClass="text-emerald-600 dark:text-emerald-400" />
          )}
          {gst > 0 && (
            <>
              <SummaryRow label="CGST" value={`₹${fmt(cgst)}`} muted />
              <SummaryRow label="SGST" value={`₹${fmt(sgst)}`} muted />
            </>
          )}
          {roundOff !== 0 && (
            <SummaryRow label="Round Off" value={`${roundOff >= 0 ? "+" : "–"} ₹${fmt(Math.abs(roundOff))}`} muted />
          )}
          <div className="mt-2 flex items-center justify-between border-t-2 border-border pt-3">
            <span className="text-base font-bold text-foreground">Grand Total</span>
            <span className="text-xl font-black text-foreground">₹{fmt(roundedTotal)}</span>
          </div>
        </div>
      </div>

      {hasReturns && (
        <p className="px-1 text-center text-xs text-muted-foreground">
          This bill has returned items. Amounts above reflect the original sale.
        </p>
      )}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card px-5 py-3.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  valueClass,
}: {
  label: string;
  value: string;
  muted?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "font-medium text-foreground"}>{label}</span>
      <span className={valueClass || (muted ? "text-foreground" : "font-semibold text-foreground")}>
        {value}
      </span>
    </div>
  );
}
