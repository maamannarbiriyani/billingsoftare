"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { MonthPicker } from "@/components/MonthPicker";
import { REPORT_TYPES } from "./reportTypes";

export function ReportNav() {
  const router = useRouter();
  const sp = useSearchParams();
  const type = sp.get("type") || "sales";
  const range = sp.get("range") || (type === "daywise" ? "month" : "today");
  const monthParam = sp.get("month");

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Monthly is fixed to the trailing 12 months — no day-range filter applies.
  const showDateFilter = type !== "monthly";

  function navigate(params: Record<string, string>) {
    const merged: Record<string, string> = { type, range, ...params };
    if (params.month) delete merged.range;
    if (params.range) delete merged.month;
    const qs = new URLSearchParams(merged).toString();
    router.push(`/reports?${qs}`);
  }

  return (
    <div className="sticky top-0 z-30 bg-background border-b border-border">
      {/* Report type pills */}
      <div className="flex overflow-x-auto scrollbar-none px-3 pt-3 pb-1 gap-1.5">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate({ type: t.id })}
            className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
              type === t.id
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t.short}
          </button>
        ))}
      </div>

      {/* Date filter */}
      {showDateFilter ? (
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none bg-muted/30">
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
          <MonthPicker
            value={monthParam}
            max={currentMonthStr}
            active={!!monthParam}
            onSelect={(m) => navigate({ month: m })}
            className="rounded-full px-3 py-1.5"
          />
        </div>
      ) : (
        <div className="px-3 py-2 bg-muted/30">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5">
            <Calendar className="h-3 w-3" />
            Last 12 Months
          </span>
        </div>
      )}
    </div>
  );
}
