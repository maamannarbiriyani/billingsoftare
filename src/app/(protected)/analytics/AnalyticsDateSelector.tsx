"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

const RANGES = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "week" },
  { label: "This Month", value: "month" },
];

export function AnalyticsDateSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const range = searchParams.get("range") || "month";
  const sort = searchParams.get("sort") || "qty";

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border shadow-sm">
        <div className="pl-2 pr-1 flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4" />
        </div>
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => router.push(`/analytics?range=${r.value}&sort=${sort}`)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              range === r.value && !monthParam
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div
        className={`flex items-center gap-2 bg-card border p-1 pl-3 rounded-xl shadow-sm transition-colors ${
          monthParam ? "border-primary" : "border-border"
        }`}
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Month</span>
        <input
          type="month"
          value={monthParam || currentMonthStr}
          max={currentMonthStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v) router.push(`/analytics?month=${v}&sort=${sort}`);
          }}
          className="bg-transparent text-sm font-medium outline-none cursor-pointer rounded-lg px-2 py-1 text-foreground"
          style={{ colorScheme: "light dark" }}
        />
      </div>
    </div>
  );
}
