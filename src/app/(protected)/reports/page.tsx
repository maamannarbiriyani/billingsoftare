import { prisma } from "@/lib/prisma";
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  PackageOpen,
  AlertTriangle,
  Eye,
  Trophy,
  BarChart3,
  CreditCard,
  Utensils
} from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ExportButton } from "./ExportButton";
import { DateRangeSelector } from "./DateRangeSelector";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const range = params.range || "today";
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (range === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else if (range === "yesterday") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else if (range === "week") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (range === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  const [filteredInvoices, filteredItems, lowStockProducts] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { createdAt: { gte: startDate, lte: endDate }, status: { not: "REFUNDED" } },
        orderBy: { createdAt: "desc" },
        include: { customer: true, order: true }
      }),
      prisma.invoiceItem.findMany({
        where: { invoice: { createdAt: { gte: startDate, lte: endDate }, status: { not: "REFUNDED" } } },
        include: { product: true }
      }),
      prisma.product.findMany({
        where: { stock: { lt: 10, not: 999999 } },
        orderBy: { stock: "asc" },
        take: 10,
      }),
    ]);

  const periodSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Breakdowns
  const paymentBreakdown = filteredInvoices.reduce((acc, inv) => {
    const method = inv.paymentMethod || "Cash";
    acc[method] = (acc[method] || 0) + inv.total;
    return acc;
  }, {} as Record<string, number>);

  const sourceBreakdown = filteredInvoices.reduce((acc, inv) => {
    const source = inv.order?.source || "DINE_IN";
    acc[source] = (acc[source] || 0) + inv.total;
    return acc;
  }, {} as Record<string, number>);

  const productSales = new Map<number, { name: string; qty: number; revenue: number }>();
  filteredItems.forEach((item) => {
    const soldQty = item.qty - item.returnedQty;
    if (soldQty <= 0) return;
    const revenue = parseFloat((soldQty * item.price).toFixed(2));
    const existing = productSales.get(item.productId);
    if (existing) {
      existing.qty += soldQty;
      existing.revenue += revenue;
    } else {
      productSales.set(item.productId, {
        name: item.product.name,
        qty: soldQty,
        revenue,
      });
    }
  });

  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const stats = [
    {
      label: "Period Revenue",
      value: `₹${periodSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-500",
      sub: `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? "s" : ""}`,
    },
    {
      label: "Avg Order Value",
      value: `₹${filteredInvoices.length > 0 ? (periodSales / filteredInvoices.length).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : 0}`,
      icon: TrendingUp,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      sub: "Per invoice",
    },
    {
      label: "Top Payment",
      value: Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
      icon: CreditCard,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      sub: "Preferred method",
      isText: true,
    },
    {
      label: "Best Seller",
      value: topProducts[0]?.name || "N/A",
      icon: Trophy,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      sub: topProducts[0] ? `${topProducts[0].qty} units sold` : "No sales yet",
      isText: true,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Page Header */}
      <div className="pb-6 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
            </div>
            <h1 className="page-title text-foreground">System Reports</h1>
          </div>
          <p className="page-subtitle ml-11 text-muted-foreground">Comprehensive overview of your business performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <DateRangeSelector />
          <ExportButton />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className={`font-extrabold text-foreground mt-0.5 ${stat.isText ? "text-sm leading-tight" : "text-xl"} truncate`} title={stat.value}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{stat.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Revenue by Payment Method
            </h2>
          </div>
          <div className="space-y-4">
            {Object.keys(paymentBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            ) : (
              Object.entries(paymentBreakdown).sort((a,b) => b[1] - a[1]).map(([method, amount]) => (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{method}</span>
                    <span className="font-bold text-foreground">₹{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(amount / periodSales) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Utensils className="h-4 w-4 text-emerald-500" />
              Revenue by Order Mode
            </h2>
          </div>
          <div className="space-y-4">
            {Object.keys(sourceBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            ) : (
              Object.entries(sourceBreakdown).sort((a,b) => b[1] - a[1]).map(([source, amount]) => (
                <div key={source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{source.replace('_', ' ')}</span>
                    <span className="font-bold text-foreground">₹{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(amount / periodSales) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Two-column tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">Invoices List</h2>
              <p className="text-xs text-muted-foreground">Transactions for this period</p>
            </div>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Method</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="py-8 text-center text-sm text-muted-foreground font-medium">No invoices found</div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/50">
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs font-semibold text-foreground">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{inv.paymentMethod}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-bold text-foreground">₹{inv.total.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">Top Selling Products</h2>
              <p className="text-xs text-muted-foreground">Highest volume items for this period</p>
            </div>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">#</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Qty</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="py-8 text-center text-sm text-muted-foreground font-medium">No sales data yet</div>
                    </td>
                  </tr>
                ) : (
                  topProducts.map((product, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? "bg-amber-500/20 text-amber-500" : idx === 1 ? "bg-muted text-foreground" : idx === 2 ? "bg-orange-500/20 text-orange-500" : "text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-foreground">{product.name}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-foreground/80">{product.qty}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-500">₹{product.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
