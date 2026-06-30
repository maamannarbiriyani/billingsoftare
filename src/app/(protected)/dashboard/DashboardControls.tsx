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
    if (params.month) delete merged.range;
    if (params.range) delete merged.month;
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
          const active = range === r.value && !monthParam;
          return (
            <button
              key={r.value}
              onClick={() => go({ range: r.value })}
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
        active={!!monthParam}
        onSelect={(m) => go({ month: m })}
        className="rounded-xl px-3 py-2"
      />
    </div>
  );
}
