import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Search, Receipt, IndianRupee, TrendingUp,
  ChevronLeft, ChevronRight, Eye, RotateCcw,
  Banknote, CreditCard, Smartphone, SplitSquareHorizontal, User,
  Calendar, Filter
} from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  PAID:           "badge badge-success",
  PARTIAL_REFUND: "badge badge-warning",
  REFUNDED:       "badge badge-danger",
};
const STATUS_LABELS: Record<string, string> = {
  PAID:           "Paid",
  PARTIAL_REFUND: "Partial Refund",
  REFUNDED:       "Refunded",
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  Cash:   <Banknote className="h-3.5 w-3.5" />,
  Card:   <CreditCard className="h-3.5 w-3.5" />,
  UPI:    <Smartphone className="h-3.5 w-3.5" />,
  SPLIT:  <SplitSquareHorizontal className="h-3.5 w-3.5" />,
  CREDIT: <User className="h-3.5 w-3.5" />,
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    method?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const query   = sp.q?.trim() || "";
  const status  = sp.status || "ALL";
  const method  = sp.method || "ALL";
  const from    = sp.from || "";
  const to      = sp.to || "";
  const page    = Math.max(1, parseInt(sp.page || "1", 10));

  // Build where clause
  const where: any = {};

  if (query) {
    where.OR = [
      { invoiceNumber: { contains: query } },
      { customer: { name: { contains: query } } },
      { cashierName: { contains: query } },
    ];
  }
  if (status !== "ALL") {
    where.status = status;
  }
  if (method !== "ALL") {
    where.paymentMethod = method;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const d = new Date(from); d.setHours(0, 0, 0, 0);
      where.createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to); d.setHours(23, 59, 59, 999);
      where.createdAt.lte = d;
    }
  }

  const [invoices, total, stats] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        subtotal: true,
        gstAmount: true,
        discountAmount: true,
        paymentMethod: true,
        status: true,
        cashierName: true,
        createdAt: true,
        customer: { select: { name: true, phone: true } },
        items: { select: { qty: true } },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({
      where,
      _sum: { total: true },
      _count: { id: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalRevenue = stats._sum.total ?? 0;

  // Build URL helper that preserves all current filters
  function buildUrl(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (query)            params.set("q", query);
    if (status !== "ALL") params.set("status", status);
    if (method !== "ALL") params.set("method", method);
    if (from)             params.set("from", from);
    if (to)               params.set("to", to);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => params.set(k, String(v)));
    return `/invoices?${params.toString()}`;
  }

  return (
    <div className="animate-fade-in space-y-6 pb-10">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="page-title">Invoice History</h1>
          <p className="page-subtitle mt-1">Complete billing history — search, filter, and view receipts</p>
        </div>
        <Link href="/billing" className="btn btn-primary self-start">
          <Receipt className="h-4 w-4" />
          New Bill
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Showing</p>
          <p className="text-2xl font-black text-foreground mt-1">{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">invoices matched</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">from filtered results</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page</p>
          <p className="text-2xl font-black text-foreground mt-1">{page} <span className="text-base font-medium text-muted-foreground">/ {Math.max(1, totalPages)}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">{PAGE_SIZE} per page</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" action="/invoices" className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        {/* Search + date row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search invoice #, customer name, cashier…"
              className="input-field pl-9"
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input type="date" name="from" defaultValue={from} className="input-field pl-9 w-40" title="From date" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input type="date" name="to" defaultValue={to} className="input-field pl-9 w-40" title="To date" />
            </div>
          </div>
        </div>

        {/* Status + method + submit row */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {/* Status chips */}
          {["ALL", "PAID", "PARTIAL_REFUND", "REFUNDED"].map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                status === s
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-muted text-muted-foreground border-border hover:border-violet-400 hover:text-violet-600"
              }`}
            >
              {s === "ALL" ? "All Status" : STATUS_LABELS[s]}
            </button>
          ))}

          <div className="w-px h-5 bg-border mx-1" />

          {/* Method chips */}
          {["ALL", "Cash", "Card", "UPI", "CREDIT"].map((m) => (
            <button
              key={m}
              type="submit"
              name="method"
              value={m}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${
                method === m
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-muted text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-600"
              }`}
            >
              {m !== "ALL" && METHOD_ICON[m]}
              {m === "ALL" ? "All Methods" : m}
            </button>
          ))}

          {/* Hidden fields to preserve other filter values */}
          <input type="hidden" name="q" value={query} />
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          <input type="hidden" name="page" value="1" />

          {(query || status !== "ALL" || method !== "ALL" || from || to) && (
            <Link
              href="/invoices"
              className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {/* Invoice Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="empty-state py-20">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-semibold text-muted-foreground">No invoices found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {query || status !== "ALL" || method !== "ALL" || from || to
                ? "Try adjusting your filters or clearing the search"
                : "Create your first bill in the Billing section"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date & Time</th>
                  <th className="text-center">Items</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Method</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Cashier</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const itemCount = inv.items.reduce((s, i) => s + i.qty, 0);
                  return (
                    <tr key={inv.id}>
                      {/* Invoice # */}
                      <td>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td>
                        {inv.customer ? (
                          <div>
                            <p className="font-semibold text-sm text-foreground">{inv.customer.name}</p>
                            {inv.customer.phone && (
                              <p className="text-xs text-muted-foreground">{inv.customer.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Walk-in</span>
                        )}
                      </td>

                      {/* Date */}
                      <td>
                        <p className="text-sm text-foreground font-medium">
                          {inv.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>

                      {/* Items */}
                      <td className="text-center">
                        <span className="text-sm font-bold text-foreground">{itemCount}</span>
                        <span className="text-xs text-muted-foreground ml-1">items</span>
                      </td>

                      {/* Amount */}
                      <td className="text-right">
                        <p className="font-black text-base text-foreground">₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {(inv.discountAmount ?? 0) > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            -{inv.discountAmount?.toFixed(2)} disc
                          </p>
                        )}
                      </td>

                      {/* Method */}
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          inv.paymentMethod === "Cash"   ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : inv.paymentMethod === "Card"  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                          : inv.paymentMethod === "UPI"   ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20"
                          : inv.paymentMethod === "CREDIT"? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                          :                                 "bg-muted text-muted-foreground border-border"
                        }`}>
                          {METHOD_ICON[inv.paymentMethod] ?? null}
                          {inv.paymentMethod}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="text-center">
                        <span className={STATUS_STYLES[inv.status] ?? "badge badge-default"}>
                          {inv.status === "PARTIAL_REFUND" && <RotateCcw className="h-2.5 w-2.5" />}
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>

                      {/* Cashier */}
                      <td className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {inv.cashierName || "—"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="text-center">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="btn btn-ghost btn-sm gap-1 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/40">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} invoices
            </p>
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Link href={buildUrl({ page: page - 1 })} className="btn btn-ghost btn-sm">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Link>
              )}
              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <Link
                    key={p}
                    href={buildUrl({ page: p })}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      p === page
                        ? "bg-violet-600 text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
              {page < totalPages && (
                <Link href={buildUrl({ page: page + 1 })} className="btn btn-ghost btn-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
