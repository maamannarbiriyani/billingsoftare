"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Filter } from "lucide-react";

const TYPES = [
  { id: "sales", label: "Sales Report" },
  { id: "items", label: "Item Wise Sales" },
  { id: "category", label: "Category Report" },
  { id: "hourly", label: "Hourly Sales" },
];

export function ReportNav() {
  const router = useRouter();
  const sp = useSearchParams();
  const type = sp.get("type") || "sales";
  const range = sp.get("range") || "today";
  const monthParam = sp.get("month");

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function navigate(params: Record<string, string>) {
    const merged: Record<string, string> = { type, range, ...params };
    if (params.month) delete merged.range;
    if (params.range) delete merged.month;
    const qs = new URLSearchParams(merged).toString();
    router.push(`/reports?${qs}`);
  }

  return (
    <div className="sticky top-0 z-30 bg-background border-b border-border">
      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-none px-4 pt-3 gap-1">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate({ type: t.id })}
            className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
              type === t.id
                ? "bg-card text-foreground border-border"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none bg-muted/30">
        {[
          { label: "Today", value: "today" },
          { label: "Yesterday", value: "yesterday" },
          { label: "7 Days", value: "week" },
          { label: "Month", value: "month" },
        ].map((r) => (
          <button
            key={r.value}
            onClick={() => navigate({ range: r.value })}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
              range === r.value && !monthParam
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-card border border-border rounded-full px-3 py-1.5">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <input
            type="month"
            value={monthParam || ""}
            max={currentMonthStr}
            onChange={(e) => { if (e.target.value) navigate({ month: e.target.value }); }}
            className="text-xs font-semibold bg-transparent outline-none text-foreground w-28"
            style={{ colorScheme: "light dark" }}
          />
        </div>
      </div>
    </div>
  );
}
