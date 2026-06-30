"use client";

import { Calendar } from "lucide-react";

function formatMonth(v: string) {
  const [y, m] = v.split("-").map(Number);
  if (!y || !m) return v;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// A month picker that always shows a readable label (never a raw browser
// placeholder). The native <input type="month"> sits invisibly on top so the
// device's month picker still opens on tap.
export function MonthPicker({
  value,
  max,
  active,
  onSelect,
  placeholder = "Pick month",
  className = "rounded-xl px-3 py-2",
}: {
  value: string | null;
  max?: string;
  active: boolean;
  onSelect: (month: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={`relative inline-flex items-center gap-2 border shadow-sm cursor-pointer transition-colors flex-shrink-0 ${className} ${
        active ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <Calendar
        className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
      />
      <span
        className={`text-sm font-semibold whitespace-nowrap ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value ? formatMonth(value) : placeholder}
      </span>
      <input
        type="month"
        value={value || ""}
        max={max}
        onChange={(e) => e.target.value && onSelect(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Pick month"
      />
    </label>
  );
}
