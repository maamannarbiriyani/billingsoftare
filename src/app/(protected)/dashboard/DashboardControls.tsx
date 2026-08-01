"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { MonthPicker } from "@/components/MonthPicker";

const RANGES = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "7 Days", value: "week" },
  { label: "30 Days", value: "30d" },
  { label: "This Month", value: "month" },
];

export function DashboardControls() {
  const router = useRouter();
  const sp = useSearchParams();
  const monthParam = sp.get("month");
  const range = sp.get("range") || "month";
  const sort = sp.get("sort") || "qty";
  const view = sp.get("view") || "top";

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function go(params: Record<string, string>) {
    const merged: Record<string, string> = { range, sort, view, ...params };
    if (params.month) { delete merged.range; delete merged.from; delete merged.to; }
    if (params.range) { delete merged.month; delete merged.from; delete merged.to; }
    if (params.from) { delete merged.range; delete merged.month; }
    
    // Clean up empty strings
    Object.keys(merged).forEach(k => {
      if (!merged[k]) delete merged[k];
    });

    const qs = new URLSearchParams(merged).toString();
    router.push(`/dashboard?${qs}`);
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 lg:flex-wrap lg:overflow-visible">
      {/* Quick ranges */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border shadow-sm flex-shrink-0">
        <div className="pl-2 pr-1 flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4" />
        </div>
        {RANGES.map((r) => {
          const active = range === r.value && !monthParam && !sp.get("from");
          return (
            <button
              key={r.value}
              onClick={() => go({ range: r.value, from: "", to: "", month: "" })}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Specific month picker */}
      <MonthPicker
        value={monthParam}
        max={currentMonthStr}
        active={!!monthParam && !sp.get("from")}
        onSelect={(m) => go({ month: m, from: "", to: "" })}
        className="rounded-xl px-3 py-2"
      />

      {/* Custom Date Range */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const f = fd.get("from") as string;
          const t = fd.get("to") as string;
          if (f && t) go({ from: f, to: t, month: "", range: "" });
        }}
        className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border shadow-sm flex-shrink-0"
      >
        <input
          type="date"
          name="from"
          defaultValue={sp.get("from") || ""}
          className="bg-transparent border-none text-sm outline-none w-[115px] px-1 text-muted-foreground focus:text-foreground"
          required
        />
        <span className="text-muted-foreground text-xs">to</span>
        <input
          type="date"
          name="to"
          defaultValue={sp.get("to") || ""}
          className="bg-transparent border-none text-sm outline-none w-[115px] px-1 text-muted-foreground focus:text-foreground"
          required
        />
        <button
          type="submit"
          className="px-2 py-1 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          Go
        </button>
      </form>
    </div>
  );
}
