import { prisma } from "@/lib/prisma";
import { requireAdmin, getActiveBranchId } from "@/lib/auth";
import { ReportNav } from "./ReportNav";
import { reportLabel } from "./reportTypes";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Whole counts show as integers (e.g. "5"); weight-based show up to 3 decimals.
function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1 shadow-sm">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-xl font-extrabold text-foreground">{value}</span>
    </div>
  );
}

function ReportShell({
  title,
  periodLabel,
  children,
}: {
  title: string;
  periodLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <ReportNav />
      <div className="px-4 py-4 space-y-4 pb-12">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-tight">
            {title}
          </h1>
          <span className="text-xs text-muted-foreground font-medium text-right flex-shrink-0 whitespace-nowrap">
            {periodLabel}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
      {msg}
    </div>
  );
}

// Horizontal labelled share bar used by item / category reports.
function ShareBar({ pct, color = "bg-primary" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string; month?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const type = params.type || "sales";
  const monthParam = params.month;
  // Day Wise reads better over a span of days, so default it to the month.
  const defaultRange = type === "daywise" ? "month" : "today";
  const range = params.range || defaultRange;
  const now = new Date();
  const title = reportLabel(type);

  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    startDate = new Date(y, m - 1, 1, 0, 0, 0);
    endDate = new Date(y, m, 0, 23, 59, 59, 999);
    periodLabel = startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } else if (range === "yesterday") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endDate = new Date(startDate.getTime() + 86400000 - 1);
    periodLabel = "Yesterday";
  } else if (range === "week") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    periodLabel = "Last 7 Days";
  } else if (range === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    periodLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate.getTime() + 86400000 - 1);
    periodLabel = "Today";
  }

  // Monthly report always spans the trailing 12 months.
  if (type === "monthly") {
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0);
    periodLabel = "Last 12 Months";
  }

  const branchId = await getActiveBranchId();
  const bf = branchId ? { branchId } : {};
  const dateF = { createdAt: { gte: startDate, lte: endDate } };

  // ─── Sales Report ────────────────────────────────────────────
  if (type === "sales") {
    const invoices = await prisma.invoice.findMany({
      where: { ...bf, ...dateF },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { qty: true } } },
    });

    const totalBills = invoices.length;
    const totalSales = invoices.filter((i) => i.status !== "REFUNDED").reduce((s, i) => s + i.total, 0);
    const totalDiscount = invoices.reduce((s, i) => s + i.discountAmount, 0);
    const totalGst = invoices.reduce((s, i) => s + i.gstAmount, 0);

    const payMap: Record<string, { count: number; amount: number; gst: number }> = {};
    invoices
      .filter((i) => i.status !== "REFUNDED")
      .forEach((inv) => {
        const m = inv.paymentMethod || "Cash";
        if (!payMap[m]) payMap[m] = { count: 0, amount: 0, gst: 0 };
        payMap[m].count++;
        payMap[m].amount += inv.total;
        payMap[m].gst += inv.gstAmount;
      });
    const allMethods = ["Cash", "Card", "UPI", "Wallet", "Khata", "Online"];

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total No. of Bills" value={String(totalBills)} />
          <StatBox label="Total Tax Amount (₹)" value={fmt(totalGst)} />
          <StatBox label="Total Discount (₹)" value={fmt(totalDiscount)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalSales)} />
        </div>

        {/* Payment breakdown */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-bold text-foreground text-sm">Payment Type Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Method</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Bills</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Amount (₹)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">GST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allMethods.map((method) => {
                  const d = payMap[method];
                  return (
                    <tr key={method} className={d ? "bg-amber-50/30 dark:bg-amber-500/5" : ""}>
                      <td className="px-4 py-2.5 font-semibold text-foreground">{method} Sales</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{d?.count ?? 0}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-foreground">{fmt(d?.amount ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(d?.gst ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill cards */}
        <h3 className="font-bold text-foreground text-sm pt-2">Bills ({totalBills})</h3>
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <EmptyState msg="No bills found for this period" />
          ) : (
            invoices.map((inv) => {
              const st =
                inv.status === "PAID"
                  ? { label: "Settled", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" }
                  : inv.status === "REFUNDED"
                  ? { label: "Refunded", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" }
                  : { label: "Partial Refund", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" };
              const units = inv.items.reduce((s, it) => s + it.qty, 0);
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}/details`} className="block">
                  <div className="bg-card rounded-xl border border-border p-4 shadow-sm active:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono font-extrabold text-foreground text-base truncate">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {" · "}
                          {inv.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                        <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">{inv.paymentMethod || "Cash"}</span>
                        <span>{units} item{units !== 1 ? "s" : ""}</span>
                        {inv.customerName && <span className="truncate">· {inv.customerName}</span>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-muted-foreground">Total</p>
                        <p className="text-lg font-black text-foreground leading-none">₹{fmt(inv.total)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-0.5 text-xs font-bold text-primary">
                      View full details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Item Wise Sales Report (alphabetical, with bill counts) ──
  if (type === "items") {
    const items = await prisma.invoiceItem.findMany({
      where: { invoice: { ...bf, ...dateF, status: { not: "REFUNDED" } } },
      include: { product: { select: { name: true, category: true } } },
    });

    const productMap = new Map<number, { name: string; category: string; qty: number; revenue: number; bills: Set<number> }>();
    items.forEach((it) => {
      const sold = it.qty - it.returnedQty;
      if (sold <= 0) return;
      const existing = productMap.get(it.productId);
      if (existing) {
        existing.qty += sold;
        existing.revenue += sold * it.price;
        existing.bills.add(it.invoiceId);
      } else {
        productMap.set(it.productId, {
          name: it.product.name,
          category: it.product.category || "Uncategorized",
          qty: sold,
          revenue: sold * it.price,
          bills: new Set([it.invoiceId]),
        });
      }
    });

    const products = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const totalQty = products.reduce((s, p) => s + p.qty, 0);
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total Quantity" value={fmtQty(totalQty)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalRevenue)} />
        </div>
        <div className="space-y-3">
          {products.length === 0 ? (
            <EmptyState msg="No items sold in this period" />
          ) : (
            products.map((p, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-extrabold text-foreground text-base">{p.name}</h3>
                  <span className="flex-shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5">
                    {p.category}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-bold text-foreground text-lg">{fmtQty(p.qty)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bills</p>
                    <p className="font-bold text-foreground text-lg">{p.bills.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-extrabold text-foreground text-lg">{fmt(p.revenue)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Item Sales Report (ranked by sales amount) ──────────────
  if (type === "itemsales") {
    const items = await prisma.invoiceItem.findMany({
      where: { invoice: { ...bf, ...dateF, status: { not: "REFUNDED" } } },
      include: { product: { select: { name: true, category: true } } },
    });

    const productMap = new Map<number, { name: string; category: string; qty: number; revenue: number }>();
    items.forEach((it) => {
      const sold = it.qty - it.returnedQty;
      if (sold <= 0) return;
      const existing = productMap.get(it.productId);
      if (existing) {
        existing.qty += sold;
        existing.revenue += sold * it.price;
      } else {
        productMap.set(it.productId, {
          name: it.product.name,
          category: it.product.category || "Uncategorized",
          qty: sold,
          revenue: sold * it.price,
        });
      }
    });

    const products = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const totalQty = products.reduce((s, p) => s + p.qty, 0);
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Items Sold" value={fmtQty(totalQty)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalRevenue)} />
        </div>
        <div className="space-y-3">
          {products.length === 0 ? (
            <EmptyState msg="No items sold in this period" />
          ) : (
            products.map((p, i) => {
              const share = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
              return (
                <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : i === 1
                          ? "bg-slate-400/20 text-slate-500"
                          : i === 2
                          ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} · {fmtQty(p.qty)} sold</p>
                    </div>
                    <p className="font-extrabold text-foreground flex-shrink-0">₹{fmt(p.revenue)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ShareBar pct={share} />
                    <span className="text-[11px] text-muted-foreground w-10 text-right">{share.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Consolidated Category Report (by category + date) ───────
  if (type === "category") {
    const items = await prisma.invoiceItem.findMany({
      where: { invoice: { ...bf, ...dateF, status: { not: "REFUNDED" } } },
      include: {
        product: { select: { category: true } },
        invoice: { select: { createdAt: true } },
      },
    });

    const catDateMap = new Map<string, { category: string; date: Date; qty: number; revenue: number }>();
    items.forEach((it) => {
      const sold = it.qty - it.returnedQty;
      if (sold <= 0) return;
      const cat = it.product.category || "Uncategorized";
      const d = it.invoice.createdAt;
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const key = `${cat}__${dateKey}`;
      const existing = catDateMap.get(key);
      if (existing) {
        existing.qty += sold;
        existing.revenue += sold * it.price;
      } else {
        catDateMap.set(key, {
          category: cat,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          qty: sold,
          revenue: sold * it.price,
        });
      }
    });

    const catRows = Array.from(catDateMap.values()).sort((a, b) => {
      const dc = b.date.getTime() - a.date.getTime();
      if (dc !== 0) return dc;
      return a.category.localeCompare(b.category);
    });
    const totalQty = catRows.reduce((s, r) => s + r.qty, 0);
    const totalRevenue = catRows.reduce((s, r) => s + r.revenue, 0);

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total Quantity" value={fmtQty(totalQty)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalRevenue)} />
        </div>
        <div className="space-y-3">
          {catRows.length === 0 ? (
            <EmptyState msg="No category data for this period" />
          ) : (
            catRows.map((row, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-bold text-foreground">
                      {row.date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category Name</p>
                    <p className="font-extrabold text-foreground">{row.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-bold text-foreground text-lg">{fmtQty(row.qty)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sales Amount (₹)</p>
                    <p className="font-extrabold text-foreground text-lg">{fmt(row.revenue)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Category Item Wise Sales Report (items grouped by category) ─
  if (type === "categoryitems") {
    const items = await prisma.invoiceItem.findMany({
      where: { invoice: { ...bf, ...dateF, status: { not: "REFUNDED" } } },
      include: { product: { select: { name: true, category: true } } },
    });

    type Item = { name: string; qty: number; revenue: number };
    const catMap = new Map<string, { qty: number; revenue: number; items: Map<number, Item> }>();
    items.forEach((it) => {
      const sold = it.qty - it.returnedQty;
      if (sold <= 0) return;
      const cat = it.product.category || "Uncategorized";
      const rev = sold * it.price;
      let group = catMap.get(cat);
      if (!group) {
        group = { qty: 0, revenue: 0, items: new Map() };
        catMap.set(cat, group);
      }
      group.qty += sold;
      group.revenue += rev;
      const existing = group.items.get(it.productId);
      if (existing) {
        existing.qty += sold;
        existing.revenue += rev;
      } else {
        group.items.set(it.productId, { name: it.product.name, qty: sold, revenue: rev });
      }
    });

    const categories = Array.from(catMap.entries())
      .map(([name, g]) => ({
        name,
        qty: g.qty,
        revenue: g.revenue,
        items: Array.from(g.items.values()).sort((a, b) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = categories.reduce((s, c) => s + c.revenue, 0);

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Categories" value={String(categories.length)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalRevenue)} />
        </div>
        <div className="space-y-3">
          {categories.length === 0 ? (
            <EmptyState msg="No category data for this period" />
          ) : (
            categories.map((cat, i) => (
              <div key={i} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/60 border-b border-border">
                  <h3 className="font-extrabold text-foreground">{cat.name}</h3>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">{fmtQty(cat.qty)} sold</p>
                    <p className="font-bold text-foreground">₹{fmt(cat.revenue)}</p>
                  </div>
                </div>
                <ul className="divide-y divide-border">
                  {cat.items.map((it, j) => (
                    <li key={j} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="font-medium text-foreground truncate">{it.name}</span>
                      <span className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-muted-foreground text-xs">×{fmtQty(it.qty)}</span>
                        <span className="font-semibold text-foreground w-20 text-right">₹{fmt(it.revenue)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Day Wise Sales Report ───────────────────────────────────
  if (type === "daywise") {
    const invoices = await prisma.invoice.findMany({
      where: { ...bf, ...dateF },
      select: { total: true, gstAmount: true, discountAmount: true, createdAt: true, status: true },
    });

    const dayMap = new Map<string, { date: Date; bills: number; sales: number; gst: number; discount: number }>();
    invoices.forEach((inv) => {
      const d = inv.createdAt;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let row = dayMap.get(key);
      if (!row) {
        row = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), bills: 0, sales: 0, gst: 0, discount: 0 };
        dayMap.set(key, row);
      }
      row.bills++;
      row.discount += inv.discountAmount;
      row.gst += inv.gstAmount;
      if (inv.status !== "REFUNDED") row.sales += inv.total;
    });

    const days = Array.from(dayMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
    const totalBills = days.reduce((s, d) => s + d.bills, 0);
    const totalSales = days.reduce((s, d) => s + d.sales, 0);

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total No. of Bills" value={String(totalBills)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalSales)} />
        </div>
        <div className="space-y-3">
          {days.length === 0 ? (
            <EmptyState msg="No sales in this period" />
          ) : (
            days.map((d, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-foreground">
                    {d.date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">{d.bills} bills</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="font-extrabold text-emerald-500">₹{fmt(d.sales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tax</p>
                    <p className="font-bold text-foreground">₹{fmt(d.gst)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Discount</p>
                    <p className="font-bold text-foreground">₹{fmt(d.discount)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Monthly Sales Report (trailing 12 months) ───────────────
  if (type === "monthly") {
    const invoices = await prisma.invoice.findMany({
      where: { ...bf, ...dateF },
      select: { total: true, gstAmount: true, discountAmount: true, createdAt: true, status: true },
    });

    const monthMap = new Map<string, { date: Date; bills: number; sales: number; gst: number; discount: number }>();
    invoices.forEach((inv) => {
      const d = inv.createdAt;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let row = monthMap.get(key);
      if (!row) {
        row = { date: new Date(d.getFullYear(), d.getMonth(), 1), bills: 0, sales: 0, gst: 0, discount: 0 };
        monthMap.set(key, row);
      }
      row.bills++;
      row.discount += inv.discountAmount;
      row.gst += inv.gstAmount;
      if (inv.status !== "REFUNDED") row.sales += inv.total;
    });

    const months = Array.from(monthMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
    const totalBills = months.reduce((s, m) => s + m.bills, 0);
    const totalSales = months.reduce((s, m) => s + m.sales, 0);
    const bestMonth = months.reduce((best, m) => (m.sales > best ? m.sales : best), 0);

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total No. of Bills" value={String(totalBills)} />
          <StatBox label="Total Sales Amount (₹)" value={fmt(totalSales)} />
        </div>
        <div className="space-y-3">
          {months.length === 0 ? (
            <EmptyState msg="No sales in the last 12 months" />
          ) : (
            months.map((m, i) => {
              const share = bestMonth > 0 ? (m.sales / bestMonth) * 100 : 0;
              return (
                <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-foreground">
                      {m.date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </h3>
                    <span className="text-xs font-semibold text-muted-foreground">{m.bills} bills</span>
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-xs text-muted-foreground">Tax ₹{fmt(m.gst)}</span>
                    <p className="font-black text-emerald-500 text-lg leading-none">₹{fmt(m.sales)}</p>
                  </div>
                  <ShareBar pct={share} color="bg-emerald-500" />
                </div>
              );
            })
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Hourly Sales Report ──────────────────────────────────────
  if (type === "hourly") {
    const invoices = await prisma.invoice.findMany({
      where: { ...bf, ...dateF, status: { not: "REFUNDED" } },
      select: { total: true, createdAt: true, id: true },
    });

    const hourMap: { count: number; revenue: number }[] = Array.from({ length: 24 }, () => ({ count: 0, revenue: 0 }));
    invoices.forEach((inv) => {
      const h = inv.createdAt.getHours();
      hourMap[h].count++;
      hourMap[h].revenue += inv.total;
    });

    const totalSales = invoices.reduce((s, i) => s + i.total, 0);
    const activeHours = hourMap.filter((h) => h.count > 0);
    let peakHour = { count: 0, revenue: 0, hr: -1 };
    hourMap.forEach((h, hr) => {
      if (h.count > peakHour.count) peakHour = { ...h, hr };
    });

    const hrLabel = (h: number) =>
      h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;

    return (
      <ReportShell title={title} periodLabel={periodLabel}>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total Bills" value={String(invoices.length)} />
          <StatBox label="Total Sales (₹)" value={fmt(totalSales)} />
          <StatBox label="Active Hours" value={String(activeHours.length)} />
          <StatBox label="Peak Hour" value={peakHour.hr >= 0 ? hrLabel(peakHour.hr) : "—"} />
        </div>
        <div className="space-y-3">
          {activeHours.length === 0 ? (
            <EmptyState msg="No sales data for this period" />
          ) : (
            hourMap.map((h, hr) => {
              if (h.count === 0) return null;
              const isPeak = hr === peakHour.hr;
              return (
                <div key={hr} className={`bg-card rounded-xl border p-4 shadow-sm ${isPeak ? "border-primary" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-extrabold text-base ${isPeak ? "text-primary" : "text-foreground"}`}>
                      {hrLabel(hr)}
                      {isPeak && <span className="ml-2 text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Peak</span>}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Orders</p>
                      <p className="font-extrabold text-foreground text-lg">{h.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Order</p>
                      <p className="font-bold text-foreground">₹{fmt(h.revenue / h.count)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-extrabold text-emerald-500">₹{fmt(h.revenue)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPeak ? "bg-primary" : "bg-primary/50"}`}
                      style={{ width: `${(h.count / (peakHour.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ReportShell>
    );
  }

  // ─── Unknown type ────────────────────────────────────────────
  return (
    <ReportShell title="Reports" periodLabel={periodLabel}>
      <EmptyState msg="Select a report from the menu." />
    </ReportShell>
  );
}
