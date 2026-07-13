import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import Link from "next/link";
import { Receipt, Search, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; method?: string; q?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const range = params.range || "today";
  const method = params.method || "";
  const q = params.q || "";

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "yesterday":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    case "week":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "all":
      startDate = new Date(2000, 0, 1);
      break;
    default: // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const where: any = { createdAt: { gte: startDate } };
  if (method) where.paymentMethod = method;
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q } },
      { customer: { name: { contains: q } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true, items: { select: { qty: true } } },
  });

  const total = invoices.reduce((s, i) => s + i.total, 0);
  const count = invoices.length;

  const RANGES = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  const METHODS = ["Cash", "Card", "UPI", "Credit"];

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ range, method, q, ...overrides });
    if (!p.get("method")) p.delete("method");
    if (!p.get("q")) p.delete("q");
    return `/owner/billing?${p.toString()}`;
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Receipt className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Billing</h1>
          <p className="text-xs text-slate-500">View all invoices and receipts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* Range tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {RANGES.map(r => (
            <Link
              key={r.value}
              href={buildHref({ range: r.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                range === r.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>

        {/* Method + Search */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            <Link
              href={buildHref({ method: "" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!method ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              All methods
            </Link>
            {METHODS.map(m => (
              <Link
                key={m}
                href={buildHref({ method: m })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${method === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {m}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Bills</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{count}</p>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{count} invoice{count !== 1 ? "s" : ""}</p>
        </div>
        {invoices.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No invoices found for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill #</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Items</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Method</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-blue-600">#{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-800">
                        {inv.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {inv.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <p className="text-xs text-slate-600">{inv.customer?.name || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-slate-500">{inv.items.reduce((s, i) => s + i.qty, 0)} items</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-700" :
                        inv.paymentMethod === "Card" ? "bg-blue-50 text-blue-700" :
                        inv.paymentMethod === "UPI" ? "bg-violet-50 text-violet-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-bold text-slate-900">₹{inv.total.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={5} className="px-5 py-3 text-sm font-bold text-slate-700">Total ({count} bills)</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
