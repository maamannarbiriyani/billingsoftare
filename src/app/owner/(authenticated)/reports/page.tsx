import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import Link from "next/link";
import { BarChart2, TrendingUp, Package, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const range = params.range || "7d";

  const now = new Date();
  let daysBack = 7;
  let isMonthly = false;

  if (range === "30d") daysBack = 30;
  else if (range === "6m") { daysBack = 180; isMonthly = true; }

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (daysBack - 1));
  startDate.setHours(0, 0, 0, 0);

  const [invoices, expensesRaw, topItemsRaw] = await Promise.all([
    prisma.invoice.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        total: true, subtotal: true, discountAmount: true,
        createdAt: true, paymentMethod: true,
        items: { select: { qty: true, costPrice: true, returnedQty: true } },
      },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startDate } },
      select: { amount: true, category: true, date: true },
    }),
    prisma.invoiceItem.findMany({
      where: { invoice: { createdAt: { gte: startDate } } },
      include: { product: { select: { name: true, category: true } } },
    }),
  ]);

  // Build chart data
  type ChartPoint = { label: string; revenue: number; profit: number };
  const chartMap: Record<string, ChartPoint> = {};

  if (isMonthly) {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      chartMap[key] = { label: key, revenue: 0, profit: 0 };
    }
    invoices.forEach(inv => {
      const key = inv.createdAt.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });
      if (chartMap[key]) {
        chartMap[key].revenue += inv.total;
        let cog = 0;
        inv.items.forEach(it => { cog += (it.qty - it.returnedQty) * it.costPrice; });
        chartMap[key].profit += (inv.subtotal - inv.discountAmount) - cog;
      }
    });
    expensesRaw.forEach(exp => {
      const key = exp.date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });
      if (chartMap[key]) chartMap[key].profit -= exp.amount;
    });
  } else {
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
      chartMap[key] = { label: key, revenue: 0, profit: 0 };
    }
    invoices.forEach(inv => {
      const key = inv.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
      if (chartMap[key]) {
        chartMap[key].revenue += inv.total;
        let cog = 0;
        inv.items.forEach(it => { cog += (it.qty - it.returnedQty) * it.costPrice; });
        chartMap[key].profit += (inv.subtotal - inv.discountAmount) - cog;
      }
    });
    expensesRaw.forEach(exp => {
      const key = exp.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
      if (chartMap[key]) chartMap[key].profit -= exp.amount;
    });
  }

  const chartData = Object.values(chartMap);
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  // Top products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  topItemsRaw.forEach(item => {
    const key = item.product.name;
    if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0 };
    productMap[key].qty += item.qty;
    productMap[key].revenue += item.qty * item.price;
  });
  const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Payment methods
  const methodMap: Record<string, number> = {};
  invoices.forEach(inv => {
    methodMap[inv.paymentMethod] = (methodMap[inv.paymentMethod] || 0) + inv.total;
  });

  // Totals
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalExpenses = expensesRaw.reduce((s, e) => s + e.amount, 0);
  let totalProfit = 0;
  invoices.forEach(inv => {
    let cog = 0;
    inv.items.forEach(it => { cog += (it.qty - it.returnedQty) * it.costPrice; });
    totalProfit += (inv.subtotal - inv.discountAmount) - cog;
  });
  totalProfit -= totalExpenses;

  const RANGES = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "6 Months", value: "6m" },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <BarChart2 className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reports</h1>
            <p className="text-xs text-slate-500">Revenue, profit &amp; product analytics</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map(r => (
            <Link
              key={r.value}
              href={`/owner/reports?range=${r.value}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                range === r.value ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Revenue</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-400 mt-1">{invoices.length} bills</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Net Profit</p>
          <p className={`text-xl font-bold mt-0.5 ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            ₹{Math.abs(totalProfit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{totalProfit >= 0 ? "Profit" : "Loss"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Expenses</p>
          <p className="text-xl font-bold text-red-500 mt-0.5">₹{totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-400 mt-1">{expensesRaw.length} entries</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Revenue vs Profit</h2>
        <div className="flex items-end gap-1 h-36">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group min-w-0">
              <div className="w-full flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm bg-blue-200 group-hover:bg-blue-300 transition-colors min-h-[2px]"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 120, 2)}px` }}
                  title={`Revenue: ₹${d.revenue.toFixed(0)}`}
                />
              </div>
              {chartData.length <= 14 && (
                <span className="text-[8px] text-slate-400 truncate w-full text-center">{d.label}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /><span className="text-xs text-slate-500">Revenue</span></div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Top Products</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No data</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => {
                const pct = Math.round((p.qty / (topProducts[0]?.qty || 1)) * 100);
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">
                        <span className="text-slate-400 mr-1">#{i + 1}</span>{p.name}
                      </span>
                      <span className="text-slate-500 flex-shrink-0">{p.qty} sold</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Payment Methods</h2>
          </div>
          {Object.keys(methodMap).length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(methodMap).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
                const pct = Math.round((amount / totalRevenue) * 100);
                const colors: Record<string, string> = {
                  Cash: "bg-emerald-500", Card: "bg-blue-500", UPI: "bg-violet-500",
                  Credit: "bg-amber-500",
                };
                return (
                  <div key={method}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{method}</span>
                      <span className="text-slate-500">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className={`h-1.5 rounded-full ${colors[method] || "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
