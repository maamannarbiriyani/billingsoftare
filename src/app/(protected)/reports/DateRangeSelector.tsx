"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

export function DateRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const currentRange = monthParam ? "" : (searchParams.get("range") || "today");

  const ranges = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "Last 7 Days" },
    { id: "month", label: "This Month" },
  ];

  // Default month input value = selected month, else current month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl shadow-sm">
        <div className="pl-2 pr-1 flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4" />
        </div>
        {ranges.map((range) => (
          <button
            key={range.id}
            onClick={() => router.push(`/reports?range=${range.id}`)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              currentRange === range.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Specific month picker */}
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
            const val = e.target.value;
            if (val) router.push(`/reports?month=${val}`);
          }}
          className="bg-transparent text-sm font-medium outline-none cursor-pointer rounded-lg px-2 py-1 text-foreground"
          style={{ colorScheme: "light dark" }}
        />
      </div>
    </div>
  );
}
