import { prisma } from "@/lib/prisma";
import { requireAdmin, getActiveBranchId } from "@/lib/auth";
import { ReportNav } from "./ReportNav";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-1 shadow-sm">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-xl font-extrabold text-foreground">{value}</span>
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
  const range = params.range || "today";
  const now = new Date();

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
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    periodLabel = "Last 7 Days";
  } else if (range === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate.getTime() + 86400000 - 1);
    periodLabel = "Today";
  }

  const branchId = await getActiveBranchId();
  const bf = branchId ? { branchId } : {};
  const dateF = { createdAt: { gte: startDate, lte: endDate } };

  // ─── Sales Report ────────────────────────────────────────────
  if (type === "sales") {
    const invoices = await prisma.invoice.findMany({
      where: { ...bf, ...dateF },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: { select: { name: true, category: true } } } },
      },
    });

    const totalBills = invoices.length;
    const totalSales = invoices.filter(i => i.status !== "REFUNDED").reduce((s, i) => s + i.total, 0);
    const totalDiscount = invoices.reduce((s, i) => s + i.discountAmount, 0);
    const totalGst = invoices.reduce((s, i) => s + i.gstAmount, 0);

    // Payment breakdown
    const payMap: Record<string, { count: number; amount: number }> = {};
    invoices.filter(i => i.status !== "REFUNDED").forEach((inv) => {
      const m = inv.paymentMethod || "Cash";
      if (!payMap[m]) payMap[m] = { count: 0, amount: 0 };
      payMap[m].count++;
      payMap[m].amount += inv.total;
    });

    const allMethods = ["Cash", "Card", "UPI", "Wallet", "Khata", "Online"];

    return (
      <div className="min-h-screen bg-muted/20">
        <ReportNav />
        <div className="px-4 py-4 space-y-4 pb-10">
          {/* Period label */}
          <p className="text-xs text-muted-foreground font-medium">
            Period: <span className="font-bold text-foreground">{periodLabel}</span>
          </p>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total No. of Bills" value={String(totalBills)} />
            <StatBox label="Total Tax Amount (₹)" value={fmt(totalGst)} />
            <StatBox label="Total Discount (₹)" value={fmt(totalDiscount)} />
            <StatBox label="Total Sales Amount (₹)" value={fmt(totalSales)} />
          </div>

          {/* Payment breakdown table */}
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
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill cards */}
          <h3 className="font-bold text-foreground text-sm pt-2">
            Bills ({totalBills})
          </h3>
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
                No bills found for this period
              </div>
            ) : (
              invoices.map((inv) => {
                const statusColor = inv.status === "PAID" ? "text-emerald-600" : inv.status === "REFUNDED" ? "text-rose-500" : "text-amber-500";
                const statusLabel = inv.status === "PAID" ? "Settled" : inv.status === "REFUNDED" ? "Refunded" : "Partial Refund";
                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}>
                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm active:opacity-70 transition-opacity">
                      {/* Bill number + arrow */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-extrabold text-base text-foreground font-mono">{inv.invoiceNumber}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {/* Grid of fields */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Bill Date</p>
                          <p className="font-semibold text-foreground">
                            {inv.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            {" "}
                            {inv.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className={`font-bold ${statusColor}`}>{statusLabel}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Payment Mode</p>
                          <p className="font-semibold text-foreground">{inv.paymentMethod}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Customer</p>
                          <p className="font-semibold text-foreground">{inv.customerName || "--"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cart Discounts</p>
                          <p className="font-semibold text-foreground">{fmt(inv.discountAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tax Amount</p>
                          <p className="font-semibold text-foreground">{fmt(inv.gstAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Base Amount</p>
                          <p className="font-semibold text-foreground">{fmt(inv.subtotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="font-extrabold text-foreground text-base">{fmt(inv.total)}</p>
                        </div>
                      </div>
                      {/* Items mini-table */}
                      {inv.items.length > 0 && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Category</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item</th>
                                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
                                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {inv.items.map((it) => (
                                <tr key={it.id}>
                                  <td className="px-3 py-2 text-muted-foreground">{it.product.category || "—"}</td>
                                  <td className="px-3 py-2 font-medium text-foreground">{it.product.name}</td>
                                  <td className="px-3 py-2 text-right text-foreground">{it.qty}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-foreground">{fmt(it.qty * it.price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Item Wise Sales Report ───────────────────────────────────
  if (type === "items") {
    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: { ...bf, ...dateF, status: { not: "REFUNDED" } },
      },
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
      <div className="min-h-screen bg-muted/20">
        <ReportNav />
        <div className="px-4 py-4 space-y-4 pb-10">
          <p className="text-xs text-muted-foreground font-medium">
            Period: <span className="font-bold text-foreground">{periodLabel}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Quantity" value={totalQty.toFixed(3)} />
            <StatBox label="Total Sales Amount (₹)" value={fmt(totalRevenue)} />
          </div>

          <div className="space-y-3">
            {products.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
                No items sold in this period
              </div>
            ) : (
              products.map((p, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <h3 className="font-extrabold text-foreground text-base mb-3">{p.name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="font-bold text-foreground text-lg">{p.qty.toFixed(3)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Sales Amount</p>
                      <p className="font-extrabold text-foreground text-lg">{fmt(p.revenue)}</p>
                    </div>
                  </div>
                  {/* Store row */}
                  <div className="mt-3 rounded-lg overflow-hidden border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Category</th>
                          <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Qty</th>
                          <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Bills</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                          <td className="px-3 py-2 text-center font-semibold text-foreground">{p.qty}</td>
                          <td className="px-3 py-2 text-center font-semibold text-foreground">{p.bills.size}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground">{fmt(p.revenue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Consolidated Category Report ────────────────────────────
  if (type === "category") {
    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: { ...bf, ...dateF, status: { not: "REFUNDED" } },
      },
      include: {
        product: { select: { category: true } },
        invoice: { select: { createdAt: true } },
      },
    });

    // Group by category + date
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
      <div className="min-h-screen bg-muted/20">
        <ReportNav />
        <div className="px-4 py-4 space-y-4 pb-10">
          <p className="text-xs text-muted-foreground font-medium">
            Period: <span className="font-bold text-foreground">{periodLabel}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Quantity" value={totalQty.toFixed(3)} />
            <StatBox label="Total Sales Amount (₹)" value={fmt(totalRevenue)} />
          </div>

          <div className="space-y-3">
            {catRows.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
                No category data for this period
              </div>
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
                      <p className="font-bold text-foreground text-lg">{row.qty.toFixed(3)}</p>
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
        </div>
      </div>
    );
  }

  // ─── Hourly Sales Report ──────────────────────────────────────
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

  function hrLabel(h: number) {
    if (h === 0) return "12:00 AM";
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${h - 12}:00 PM`;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <ReportNav />
      <div className="px-4 py-4 space-y-4 pb-10">
        <p className="text-xs text-muted-foreground font-medium">
          Period: <span className="font-bold text-foreground">{periodLabel}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total Bills" value={String(invoices.length)} />
          <StatBox label="Total Sales (₹)" value={fmt(totalSales)} />
          <StatBox label="Active Hours" value={String(activeHours.length)} />
          <StatBox label="Peak Hour" value={peakHour.hr >= 0 ? hrLabel(peakHour.hr) : "—"} />
        </div>

        <div className="space-y-3">
          {activeHours.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
              No sales data for this period
            </div>
          ) : (
            hourMap.map((h, hr) => {
              if (h.count === 0) return null;
              const isPeak = hr === peakHour.hr;
              return (
                <div
                  key={hr}
                  className={`bg-card rounded-xl border p-4 shadow-sm ${isPeak ? "border-primary" : "border-border"}`}
                >
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
                  {/* Mini bar */}
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
      </div>
    </div>
  );
}
