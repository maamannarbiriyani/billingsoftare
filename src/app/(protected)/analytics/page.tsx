import { prisma } from "@/lib/prisma";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Trophy,
  Clock,
  Users,
  BarChart3,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { requireAdmin, getActiveBranchId } from "@/lib/auth";
import Link from "next/link";
import { AnalyticsDateSelector } from "./AnalyticsDateSelector";

export const dynamic = "force-dynamic";

function fmtINR(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number, total: number) {
  if (total === 0) return "0";
  return ((n / total) * 100).toFixed(1);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string; sort?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const monthParam = params.month;
  const range = params.range || "month";
  const sort = params.sort || "qty"; // "qty" | "revenue" | "profit"
  const now = new Date();

  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    startDate = new Date(y, m - 1, 1, 0, 0, 0);
    endDate = new Date(y, m, 0, 23, 59, 59, 999);
    periodLabel = startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (range === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate.getTime() + 86400000 - 1);
    periodLabel = "Today";
  } else if (range === "week") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    periodLabel = "Last 7 Days";
  } else {
    // default: this month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const branchId = await getActiveBranchId();
  const bf = branchId ? { branchId } : {};

  const [invoiceItems, invoices, expenses] = await Promise.all([
    prisma.invoiceItem.findMany({
      where: {
        invoice: {
          ...bf,
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "REFUNDED" },
        },
      },
      include: { product: { select: { name: true, category: true } } },
    }),
    prisma.invoice.findMany({
      where: {
        ...bf,
        createdAt: { gte: startDate, lte: endDate },
        status: { not: "REFUNDED" },
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discountAmount: true,
        gstAmount: true,
        customerId: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        items: { select: { qty: true, returnedQty: true, costPrice: true } },
      },
    }),
    prisma.expense.findMany({
      where: { ...bf, date: { gte: startDate, lte: endDate } },
    }),
  ]);

  // ── P&L ──────────────────────────────────────────────────────
  const totalRevenue = invoices.reduce((s, inv) => s + inv.total, 0);
  let totalCOGS = 0;
  invoices.forEach((inv) => {
    inv.items.forEach((it) => {
      totalCOGS += (it.qty - it.returnedQty) * it.costPrice;
    });
  });
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // ── Product performance ───────────────────────────────────────
  const productMap = new Map<
    number,
    { name: string; category: string; qty: number; revenue: number; cost: number }
  >();
  invoiceItems.forEach((it) => {
    const sold = it.qty - it.returnedQty;
    if (sold <= 0) return;
    const rev = sold * it.price;
    const cost = sold * it.costPrice;
    const existing = productMap.get(it.productId);
    if (existing) {
      existing.qty += sold;
      existing.revenue += rev;
      existing.cost += cost;
    } else {
      productMap.set(it.productId, {
        name: it.product.name,
        category: it.product.category || "Uncategorized",
        qty: sold,
        revenue: parseFloat(rev.toFixed(2)),
        cost: parseFloat(cost.toFixed(2)),
      });
    }
  });

  const productList = Array.from(productMap.values()).sort((a, b) => {
    if (sort === "revenue") return b.revenue - a.revenue;
    if (sort === "profit") return (b.revenue - b.cost) - (a.revenue - a.cost);
    return b.qty - a.qty; // default: qty
  });

  const totalQty = productList.reduce((s, p) => s + p.qty, 0);

  // ── Category breakdown ────────────────────────────────────────
  const catMap = new Map<string, { qty: number; revenue: number }>();
  productList.forEach((p) => {
    const existing = catMap.get(p.category);
    if (existing) {
      existing.qty += p.qty;
      existing.revenue += p.revenue;
    } else {
      catMap.set(p.category, { qty: p.qty, revenue: p.revenue });
    }
  });
  const categories = Array.from(catMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Peak hours ────────────────────────────────────────────────
  const hourMap: { count: number; revenue: number }[] = Array.from({ length: 24 }, () => ({
    count: 0,
    revenue: 0,
  }));
  invoices.forEach((inv) => {
    const h = inv.createdAt.getHours();
    hourMap[h].count++;
    hourMap[h].revenue += inv.total;
  });
  const maxHourCount = Math.max(...hourMap.map((h) => h.count), 1);

  // ── Top customers ─────────────────────────────────────────────
  const custMap = new Map<
    string,
    { name: string; phone: string | null; visits: number; spent: number }
  >();
  invoices.forEach((inv) => {
    const key = inv.customerId
      ? `cust-${inv.customerId}`
      : `walkin-${inv.customerPhone || inv.customerName || "anon"}`;
    const name = inv.customerName || "Walk-in";
    const existing = custMap.get(key);
    if (existing) {
      existing.visits++;
      existing.spent += inv.total;
    } else {
      custMap.set(key, { name, phone: inv.customerPhone, visits: 1, spent: inv.total });
    }
  });
  const topCustomers = Array.from(custMap.values())
    .filter((c) => c.name !== "Walk-in" || c.phone)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 10);

  // ── Expense breakdown ─────────────────────────────────────────
  const expCatMap = new Map<string, number>();
  expenses.forEach((e) => {
    expCatMap.set(e.category, (expCatMap.get(e.category) || 0) + e.amount);
  });
  const expBreakdown = Array.from(expCatMap.entries())
    .map(([cat, amount]) => ({ cat, amount }))
    .sort((a, b) => b.amount - a.amount);

  const SORTS = [
    { label: "By Qty", value: "qty" },
    { label: "By Revenue", value: "revenue" },
    { label: "By Profit", value: "profit" },
  ];

  const sortBase = monthParam ? `month=${monthParam}` : `range=${range}`;

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      {/* Header */}
      <div className="pb-5 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-violet-500" />
            </div>
            <h1 className="page-title text-foreground">Sales Intelligence</h1>
          </div>
          <p className="page-subtitle ml-11 text-muted-foreground">
            Deep analytics for{" "}
            <span className="font-semibold text-foreground">{periodLabel}</span>
          </p>
        </div>
        <AnalyticsDateSelector />
      </div>

      {/* P&L Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Revenue",
            value: `₹${fmtINR(totalRevenue)}`,
            icon: IndianRupee,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-[rgba(37,99,235,0.1)]",
          },
          {
            label: "Cost of Goods",
            value: `₹${fmtINR(totalCOGS)}`,
            icon: Package,
            color: "text-orange-500",
            bg: "bg-orange-50 dark:bg-[rgba(249,115,22,0.1)]",
          },
          {
            label: "Gross Profit",
            value: `₹${fmtINR(grossProfit)}`,
            sub: `${grossMargin.toFixed(1)}% margin`,
            icon: grossProfit >= 0 ? TrendingUp : TrendingDown,
            color: grossProfit >= 0 ? "text-emerald-500" : "text-rose-500",
            bg: grossProfit >= 0 ? "bg-emerald-50 dark:bg-[rgba(16,185,129,0.1)]" : "bg-rose-50 dark:bg-[rgba(239,68,68,0.1)]",
          },
          {
            label: "Total Expenses",
            value: `₹${fmtINR(totalExpenses)}`,
            icon: TrendingDown,
            color: "text-rose-500",
            bg: "bg-rose-50 dark:bg-[rgba(239,68,68,0.1)]",
          },
          {
            label: "Net Profit",
            value: `₹${fmtINR(netProfit)}`,
            icon: netProfit >= 0 ? ArrowUpRight : ArrowDownRight,
            color: netProfit >= 0 ? "text-emerald-500" : "text-rose-500",
            bg: netProfit >= 0 ? "bg-emerald-50 dark:bg-[rgba(16,185,129,0.1)]" : "bg-rose-50 dark:bg-[rgba(239,68,68,0.1)]",
          },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border border-border p-4 shadow-sm bg-card`}>
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className={`text-base font-extrabold mt-0.5 ${card.color}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Product Performance */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Product Performance ({productList.length} items)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">All items sold in this period</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={`?${sortBase}&sort=${s.value}`}
                className="px-3 py-1.5 text-xs font-bold rounded-md transition-all"
                style={
                  sort === s.value
                    ? { background: "var(--primary)", color: "#fff" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-10">#</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Product</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Qty Sold</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">% of Sales</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Revenue</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Cost</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Profit</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {productList.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="py-10 text-center text-sm text-muted-foreground">No sales data for this period</div>
                  </td>
                </tr>
              ) : (
                productList.map((p, idx) => {
                  const profit = p.revenue - p.cost;
                  const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
                  const qtyShare = totalQty > 0 ? (p.qty / totalQty) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0
                              ? "bg-amber-500/20 text-amber-500"
                              : idx === 1
                              ? "bg-slate-400/20 text-slate-400"
                              : idx === 2
                              ? "bg-orange-500/20 text-orange-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground text-sm">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{p.qty}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${qtyShare}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{qtyShare.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">₹{fmtINR(p.revenue)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-sm">₹{fmtINR(p.cost)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {profit >= 0 ? "+" : ""}₹{fmtINR(profit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            margin >= 50
                              ? "bg-emerald-500/10 text-emerald-500"
                              : margin >= 20
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-500" />
              Category Performance
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue and volume by food category</p>
          </div>
          <div className="p-6 space-y-4">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data for this period</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{cat.qty} sold</span>
                      <span className="font-bold text-foreground">₹{fmtINR(cat.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${pct(cat.revenue, totalRevenue)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 text-right">
                    {pct(cat.revenue, totalRevenue)}% of revenue
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-500" />
              Peak Hours
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Orders by hour of day — plan staffing around this</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-0.5">
              {hourMap.map((h, hr) => {
                const heightPct = (h.count / maxHourCount) * 100;
                const isActive = h.count > 0;
                const isPeak = h.count === maxHourCount && h.count > 0;
                const label = hr === 0 ? "12a" : hr < 12 ? `${hr}a` : hr === 12 ? "12p" : `${hr - 12}p`;
                return (
                  <div key={hr} className="flex flex-col items-center gap-1">
                    <div className="relative w-full h-20 flex items-end">
                      <div
                        title={`${label}: ${h.count} orders, ₹${fmtINR(h.revenue)}`}
                        className={`w-full rounded-t-sm transition-all ${
                          isPeak ? "bg-cyan-500" : isActive ? "bg-primary/60" : "bg-muted"
                        }`}
                        style={{ height: `${Math.max(heightPct, isActive ? 8 : 2)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
            {/* Top 5 peak hours table */}
            <div className="mt-4 space-y-1">
              {hourMap
                .map((h, hr) => ({ ...h, hr }))
                .filter((h) => h.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((h) => {
                  const label =
                    h.hr === 0
                      ? "12:00 AM"
                      : h.hr < 12
                      ? `${h.hr}:00 AM`
                      : h.hr === 12
                      ? "12:00 PM"
                      : `${h.hr - 12}:00 PM`;
                  return (
                    <div key={h.hr} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground w-20">{label}</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${(h.count / maxHourCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs w-16 text-right">{h.count} orders</span>
                      <span className="font-bold text-foreground w-24 text-right">₹{fmtINR(h.revenue)}</span>
                    </div>
                  );
                })}
              {hourMap.every((h) => h.count === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No orders in this period</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-500" />
              Top Customers
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Loyal customers by total spend</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase text-center">Visits</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="py-8 text-center text-sm text-muted-foreground">No named customers in this period</div>
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-5 py-3 text-muted-foreground text-sm">{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground text-sm">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-500/10 text-sky-500 text-xs font-bold">
                          {c.visits}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-500">₹{fmtINR(c.spent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              Expense Breakdown
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Where your money is going</p>
          </div>
          <div className="p-6 space-y-4">
            {expBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No expenses logged for this period</p>
            ) : (
              expBreakdown.map((e) => (
                <div key={e.cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-foreground">{e.cat}</span>
                    <span className="font-bold text-foreground">₹{fmtINR(e.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500/70 rounded-full"
                      style={{ width: `${pct(e.amount, totalExpenses)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 text-right">
                    {pct(e.amount, totalExpenses)}% of expenses
                  </p>
                </div>
              ))
            )}
            {expBreakdown.length > 0 && (
              <div className="pt-3 border-t border-border flex justify-between">
                <span className="font-bold text-foreground text-sm">Total</span>
                <span className="font-extrabold text-rose-500">₹{fmtINR(totalExpenses)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-emerald-500" />
          Profit & Loss Summary — {periodLabel}
        </h2>
        <div className="space-y-2 max-w-sm">
          {[
            { label: "Total Revenue", value: totalRevenue, color: "text-foreground" },
            { label: "(-) Cost of Goods Sold", value: -totalCOGS, color: "text-orange-500" },
            { label: "= Gross Profit", value: grossProfit, color: grossProfit >= 0 ? "text-emerald-500" : "text-rose-500", bold: true },
            { label: "(-) Operating Expenses", value: -totalExpenses, color: "text-rose-500" },
            { label: "= Net Profit", value: netProfit, color: netProfit >= 0 ? "text-emerald-600" : "text-rose-600", bold: true, border: true },
          ].map((row) => (
            <div
              key={row.label}
              className={`flex justify-between items-center py-1.5 ${row.border ? "border-t-2 border-border mt-2 pt-3" : ""}`}
            >
              <span className={`text-sm ${row.bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {row.label}
              </span>
              <span className={`font-bold text-sm ${row.color}`}>
                {row.value >= 0 ? "₹" : "-₹"}{fmtINR(Math.abs(row.value))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
