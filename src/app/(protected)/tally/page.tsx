import { requireAdmin } from "@/lib/auth";
import { getTallyData } from "@/app/actions/tally";
import { DateRangeSelector } from "../reports/DateRangeSelector";
import { BookOpen, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { getISTDateRange } from "@/lib/dateUtils";

export default async function TallyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const range = params.range || "today";
  const { startDate, endDate } = getISTDateRange(range, null);

  const tally = await getTallyData(startDate, endDate);
  const isProfitable = tally.netProfit >= 0;

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Header */}
      <div className="pb-6 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-purple-500" />
            </div>
            <h1 className="page-title text-foreground">Tally Ledger</h1>
          </div>
          <p className="page-subtitle ml-11 text-muted-foreground">Unified In-home Profit & Loss statement</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* We reuse the DateRangeSelector from reports but point it to /tally */}
          <DateRangeSelector />
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <TrendingUp className="h-24 w-24 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> Total Inflow (Revenue)
            </p>
            <p className="text-3xl font-black text-foreground mt-2">₹{tally.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">From {tally.invoicesCount} Sales Invoices</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <TrendingDown className="h-24 w-24 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-rose-500 dark:text-rose-400" /> Total Outflow (Expense)
            </p>
            <p className="text-3xl font-black text-foreground mt-2">₹{tally.totalExpense.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">From {tally.expensesCount} Expense Entries (inc. Salaries)</p>
          </div>
        </div>

        <div className={`border rounded-2xl p-6 shadow-sm relative overflow-hidden ${isProfitable ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Wallet className={`h-24 w-24 ${isProfitable ? "text-emerald-500" : "text-rose-500"}`} />
          </div>
          <div className="relative z-10">
            <p className={`text-sm font-bold uppercase tracking-widest ${isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              Net {isProfitable ? "Profit" : "Loss"}
            </p>
            <p className={`text-3xl font-black mt-2 ${isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              ₹{Math.abs(tally.netProfit).toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${isProfitable ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-rose-600/80 dark:text-rose-400/80"}`}>
              For selected period
            </p>
          </div>
        </div>
      </div>

      {/* Categorized Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* Revenue Categories */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Inflow by Category
            </h2>
          </div>
          <div className="p-0 flex-1">
            <table className="w-full text-left">
              <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.keys(tally.revenueByCategory).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-muted-foreground">No revenue data</td>
                  </tr>
                ) : (
                  Object.entries(tally.revenueByCategory).sort((a,b) => b[1]-a[1]).map(([cat, val]) => (
                    <tr key={cat} className="hover:bg-muted/50">
                      <td className="px-6 py-3 font-medium text-foreground">{cat}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-500">₹{val.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Outflow by Category
            </h2>
          </div>
          <div className="p-0 flex-1">
            <table className="w-full text-left">
              <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.keys(tally.expenseByCategory).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-muted-foreground">No expense data</td>
                  </tr>
                ) : (
                  Object.entries(tally.expenseByCategory).sort((a,b) => b[1]-a[1]).map(([cat, val]) => (
                    <tr key={cat} className="hover:bg-muted/50">
                      <td className="px-6 py-3 font-medium text-foreground">{cat}</td>
                      <td className="px-6 py-3 text-right font-bold text-rose-500">₹{val.toLocaleString()}</td>
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
