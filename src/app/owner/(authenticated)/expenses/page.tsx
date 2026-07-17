import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { getISTDateRange, toIST } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function OwnerExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const range = params.range || "month";

  const { startDate, endDate } = getISTDateRange(range);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: "desc" },
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catMap: Record<string, number> = {};
  expenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  const RANGES = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Wallet className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <p className="text-xs text-slate-500">Track all business expenses</p>
        </div>
      </div>

      {/* Range tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {RANGES.map(r => (
          <Link
            key={r.value}
            href={`/owner/expenses?range=${r.value}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              range === r.value ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-0.5">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-400 mt-1">{expenses.length} entries</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Categories</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{Object.keys(catMap).length}</p>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(catMap).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4 text-sm">By Category</h2>
          <div className="space-y-2.5">
            {Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, amount], i) => {
              const pct = Math.round((amount / total) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="text-slate-500">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className={`h-1.5 rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">Expense Log</p>
        </div>
        {expenses.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No expenses in this period</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {expenses.map(exp => (
              <div key={exp.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{exp.category}</span>
                    <span className="text-xs text-slate-400">
<<<<<<< Updated upstream
                      {exp.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
=======
                      {toIST(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
>>>>>>> Stashed changes
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600">₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
