import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import { IndianRupee, ReceiptText, TrendingUp, AlertTriangle, Package, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, icon: Icon, color, href }: {
  label: string; value: string; sub?: string;
  icon: any; color: string; href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-slate-300" />}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-3">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function OwnerDashboardPage() {
  await requireOwner();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000 - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - 6);

  const [
    todaySales, todayCount,
    monthSales, monthCount,
    weekData,
    totalProducts, lowStock,
    totalEmployees,
    recentInvoices,
    branches,
  ] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.invoice.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.invoice.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: startOfWeek } },
      select: { total: true, createdAt: true },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { stock: { lt: 10, not: 999999 } } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.findMany({
      take: 8, orderBy: { createdAt: "desc" },
      select: { id: true, invoiceNumber: true, total: true, createdAt: true, paymentMethod: true },
    }),
    prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  // Build 7-day sparkline data
  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfDay);
    d.setDate(startOfDay.getDate() - i);
    const key = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    dayMap[key] = 0;
  }
  weekData.forEach(inv => {
    const key = inv.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    if (dayMap[key] !== undefined) dayMap[key] += inv.total;
  });
  const sparkData = Object.entries(dayMap);

  const todayRevenue = todaySales._sum.total || 0;
  const monthRevenue = monthSales._sum.total || 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"} 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub={`${todayCount} bills today`}
          icon={IndianRupee}
          color="bg-blue-50 text-blue-600"
          href="/owner/billing"
        />
        <StatCard
          label="This Month"
          value={`₹${monthRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub={`${monthCount} bills`}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-600"
          href="/owner/reports"
        />
        <StatCard
          label="Products"
          value={`${totalProducts}`}
          sub={lowStock > 0 ? `${lowStock} low stock` : "Stock OK"}
          icon={Package}
          color={lowStock > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"}
          href="/owner/products"
        />
        <StatCard
          label="Active Staff"
          value={`${totalEmployees}`}
          sub="employees"
          icon={Users}
          color="bg-violet-50 text-violet-600"
          href="/owner/staff"
        />
      </div>

      {/* 7-Day Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">7-Day Revenue</h2>
            <p className="text-xs text-slate-400 mt-0.5">Daily billing totals this week</p>
          </div>
          <Link href="/owner/reports" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
            Full reports <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {(() => {
            const maxVal = Math.max(...sparkData.map(([, v]) => v), 1);
            return sparkData.map(([day, val]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  ₹{val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <div
                  className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors min-h-[4px]"
                  style={{ height: `${Math.max((val / maxVal) * 88, 4)}px` }}
                />
                <span className="text-[9px] text-slate-400">{day.split(" ")[0]}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bills */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Bills</h2>
            <Link href="/owner/billing" className="text-xs text-blue-600 font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {recentInvoices.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No bills yet</p>}
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">#{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-400">
                    {inv.createdAt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                    {" · "}{inv.paymentMethod}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">₹{inv.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branches */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Branches</h2>
            <Link href="/owner/branches" className="text-xs text-blue-600 font-medium hover:underline">Manage</Link>
          </div>
          {branches.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-400">No branches configured</p>
              <Link href="/owner/settings" className="text-xs text-blue-600 mt-1 hover:underline inline-block">Add branches →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map(b => (
                <div key={b.id} className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">{b.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.name}</p>
                    {b.phone && <p className="text-xs text-slate-400">{b.phone}</p>}
                    {b.address && <p className="text-xs text-slate-400 truncate max-w-[180px]">{b.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{lowStock} product{lowStock > 1 ? "s" : ""} running low on stock</p>
            <p className="text-xs text-amber-600 mt-0.5">Check inventory and restock soon</p>
          </div>
          <Link href="/owner/products" className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline flex-shrink-0">
            View →
          </Link>
        </div>
      )}
    </div>
  );
}
