import { prisma } from "@/lib/prisma";
import {
  IndianRupee,
  Package,
  ReceiptText,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  PieChart as PieChartIcon
} from "lucide-react";
import { RevenueBarChart } from "@/components/dashboard/RevenueBarChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { StatCard } from "@/components/dashboard/StatCard";
import Link from "next/link";
import { requireAdmin, getActiveBranchId } from "@/lib/auth";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const branchId = await getActiveBranchId();
  const bf = branchId ? { branchId } : {};
  const resolvedSearchParams = await searchParams;
  const { range = "7d" } = resolvedSearchParams;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Determine chart range date
  const chartStartDate = new Date();
  let daysInChart = 7;

  if (range === "30d") {
    daysInChart = 30;
    chartStartDate.setDate(chartStartDate.getDate() - 29);
  } else if (range === "6m") {
    daysInChart = 180;
    chartStartDate.setMonth(chartStartDate.getMonth() - 6);
  } else {
    chartStartDate.setDate(chartStartDate.getDate() - 6);
  }
  chartStartDate.setHours(0, 0, 0, 0);

  let todaySalesResult, totalProducts, totalBills, lowStockItems, recentInvoices, chartDataRaw, categoryDataRaw, expensesRaw;

  try {
    const results = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { ...bf, createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.product.count({ where: { ...bf, isActive: true } }),
      prisma.invoice.count({ where: bf }),
      prisma.product.count({ where: { ...bf, stock: { lt: 10, not: 999999 }, isActive: true } }),
      prisma.invoice.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        where: bf,
        select: { id: true, invoiceNumber: true, total: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        where: { ...bf, createdAt: { gte: chartStartDate } },
        select: {
          total: true,
          createdAt: true,
          subtotal: true,
          discountAmount: true,
          items: { select: { qty: true, costPrice: true, returnedQty: true } }
        },
      }),
      prisma.invoiceItem.findMany({
        where: { invoice: { ...bf, createdAt: { gte: chartStartDate } } },
        include: { product: { select: { category: true } } },
      }),
      prisma.expense.findMany({
        where: bf,
        orderBy: { createdAt: "desc" },
        take: 100
      }),
    ]);

    [
      todaySalesResult,
      totalProducts,
      totalBills,
      lowStockItems,
      recentInvoices,
      chartDataRaw,
      categoryDataRaw,
      expensesRaw,
    ] = results;
  } catch (error) {
    console.error("Dashboard DB Error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-card rounded-xl border border-border shadow-sm">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Database Connection Error</h2>
        <p className="text-muted-foreground max-w-md">
          We could not load the dashboard data. Your database connection might be timing out or limits have been reached. Please check your Vercel Environment Variables and Supabase connection.
        </p>
      </div>
    );
  }

  const todaySales = todaySalesResult._sum.total || 0;

  const todayExpenses = expensesRaw.filter(e => e.date >= startOfDay && e.date <= endOfDay)
                                  .reduce((sum, e) => sum + e.amount, 0);

  const todayInvoices = chartDataRaw.filter(inv => inv.createdAt >= startOfDay && inv.createdAt <= endOfDay);
  let todayProfit = 0;
  todayInvoices.forEach(inv => {
    let costOfGoods = 0;
    inv.items.forEach(item => {
      const soldQty = item.qty - item.returnedQty;
      costOfGoods += soldQty * item.costPrice;
    });
    const revenueWithoutTax = inv.subtotal - inv.discountAmount;
    todayProfit += (revenueWithoutTax - costOfGoods);
  });
  todayProfit -= todayExpenses;

  const chartMap: Record<string, { revenue: number, profit: number }> = {};

  if (range === "6m") {
    for (let i = 0; i <= 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      chartMap[key] = { revenue: 0, profit: 0 };
    }
    chartDataRaw.forEach((invoice) => {
      const key = invoice.createdAt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (chartMap[key]) {
        chartMap[key].revenue += invoice.total;
        let costOfGoods = 0;
        invoice.items.forEach(item => {
          costOfGoods += (item.qty - item.returnedQty) * item.costPrice;
        });
        chartMap[key].profit += ((invoice.subtotal - invoice.discountAmount) - costOfGoods);
      }
    });
    expensesRaw.forEach((expense) => {
      const key = expense.date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (chartMap[key]) chartMap[key].profit -= expense.amount;
    });
  } else {
    for (let i = 0; i < daysInChart; i++) {
      const d = new Date(chartStartDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      chartMap[dateStr] = { revenue: 0, profit: 0 };
    }
    chartDataRaw.forEach((invoice) => {
      const dateStr = invoice.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (chartMap[dateStr]) {
        chartMap[dateStr].revenue += invoice.total;
        let costOfGoods = 0;
        invoice.items.forEach(item => {
          costOfGoods += (item.qty - item.returnedQty) * item.costPrice;
        });
        chartMap[dateStr].profit += ((invoice.subtotal - invoice.discountAmount) - costOfGoods);
      }
    });
    expensesRaw.forEach((expense) => {
      const dateStr = expense.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (chartMap[dateStr]) chartMap[dateStr].profit -= expense.amount;
    });
  }

  let chartDataKeys = Object.keys(chartMap);
  if (range === "6m") chartDataKeys = chartDataKeys.reverse();

  const chartData = chartDataKeys.map((date) => ({
    date,
    total: chartMap[date].revenue,
    profit: chartMap[date].profit > 0 ? chartMap[date].profit : 0,
  }));

  const catMap: Record<string, number> = {};
  categoryDataRaw.forEach((item) => {
    const cat = item.product.category || "Uncategorized";
    catMap[cat] = (catMap[cat] || 0) + item.qty;
  });
  const pieData = Object.keys(catMap).map((cat) => ({
    name: cat,
    value: catMap[cat],
  })).sort((a, b) => b.value - a.value);

  const stats = [
    {
      name: "Today's Revenue",
      value: todaySales,
      decimals: 2,
      prefix: "₹",
      icon: IndianRupee,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-[rgba(139,92,246,0.1)]",
    },
    {
      name: "Today's Net Profit",
      value: todayProfit,
      decimals: 2,
      prefix: "₹",
      icon: IndianRupee,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-[rgba(16,185,129,0.08)]",
    },
    {
      name: "Total Bills",
      value: totalBills,
      decimals: 0,
      prefix: "",
      icon: ReceiptText,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-[rgba(34,211,238,0.08)]",
    },
    {
      name: "Low Stock Items",
      value: lowStockItems,
      decimals: 0,
      prefix: "",
      icon: AlertTriangle,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-[rgba(239,68,68,0.08)]",
    },
  ];

  const activities: any[] = [];
  if (lowStockItems > 0) {
    activities.push({
      id: "alert-1",
      type: "ALERT",
      title: `${lowStockItems} Items low on stock`,
      timestamp: new Date(),
      status: "warning",
    });
  }
  recentInvoices.forEach((inv) => {
    activities.push({
      id: `inv-${inv.id}`,
      type: "INVOICE",
      title: `Invoice #${inv.invoiceNumber} Generated`,
      timestamp: inv.createdAt,
      status: "success",
    });
  });
  expensesRaw.slice(0, 3).forEach((exp) => {
    activities.push({
      id: `exp-${exp.id}`,
      type: "EXPENSE",
      title: `Expense Logged: ₹${exp.amount.toLocaleString()}`,
      timestamp: exp.createdAt,
      status: "info",
    });
  });
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="animate-fade-in pb-12 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 mb-2 border-b border-border">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle mt-1">Welcome back — here&apos;s your store at a glance.</p>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center p-1 gap-1 self-start rounded-lg bg-muted border border-border">
          {[
            { label: "7D", value: "7d" },
            { label: "30D", value: "30d" },
            { label: "6M", value: "6m" },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={`?range=${opt.value}`}
              className="px-3.5 py-1.5 text-xs font-bold rounded-md transition-all"
              style={
                range === opt.value
                  ? {
                      background: "rgba(139,92,246,0.2)",
                      color: "#c4b5fd",
                      border: "1px solid rgba(139,92,246,0.3)",
                    }
                  : {
                      color: "var(--muted-foreground)",
                      border: "1px solid transparent",
                    }
              }
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.name}
            name={item.name}
            value={item.value as number}
            decimals={item.decimals}
            prefix={item.prefix}
            icon={<item.icon className={`h-5 w-5 ${item.color}`} />}
            bg={item.bg}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 rounded-xl p-5 bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Revenue Trends</h2>
              <p className="text-xs mt-0.5 text-muted-foreground">Earnings across the selected timeframe</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-[rgba(139,92,246,0.12)] border border-violet-100 dark:border-[rgba(139,92,246,0.2)]">
              <ArrowUpRight className="h-4 w-4 text-violet-500 dark:text-[#a78bfa]" />
            </div>
          </div>
          <RevenueBarChart data={chartData} />
        </div>

        {/* Category Chart */}
        <div className="rounded-xl p-5 flex flex-col bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Top Categories</h2>
              <p className="text-xs mt-0.5 text-muted-foreground">Items sold by category</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-50 dark:bg-[rgba(34,211,238,0.08)] border border-cyan-100 dark:border-[rgba(34,211,238,0.2)]">
              <PieChartIcon className="h-4 w-4 text-cyan-500 dark:text-[#22d3ee]" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <CategoryPieChart data={pieData} />
          </div>
        </div>
      </div>

      {/* Live Intelligence Feed */}
      <div className="rounded-xl overflow-hidden bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">Live Intelligence</h2>
            <p className="text-xs mt-0.5 text-muted-foreground">Real-time system activity</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-50 dark:bg-[rgba(34,211,238,0.08)] border border-cyan-100 dark:border-[rgba(34,211,238,0.15)]">
            <Clock className="h-4 w-4 text-cyan-500 dark:text-[#22d3ee]" />
          </div>
        </div>
        <div className="p-4">
          <RecentActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
}
