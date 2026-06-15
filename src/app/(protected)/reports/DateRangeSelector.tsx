"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

export function DateRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "today";

  const ranges = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "Last 7 Days" },
    { id: "month", label: "This Month" },
  ];

  return (
    <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl shadow-sm">
      <div className="pl-3 pr-2 flex items-center text-muted-foreground">
        <Calendar className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1">
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
    </div>
  );
}
