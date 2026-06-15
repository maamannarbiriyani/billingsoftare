"use client";

import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";

type StatCardProps = {
  name: string;
  value: number;
  decimals: number;
  prefix: string;
  icon: React.ReactNode;
  bg: string;
};

export function StatCard({ name, value, decimals, prefix, icon, bg }: StatCardProps) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl p-5 transition-all duration-200 relative overflow-hidden cursor-default bg-card border border-border shadow-sm hover:-translate-y-0.5"
    >
      {/* Colored icon box */}
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 border border-border`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {name}
        </p>
        <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-foreground" style={{ letterSpacing: "-0.04em" }}>
          <AnimatedCounter value={value} decimals={decimals} prefix={prefix} />
        </h3>
      </div>
    </div>
  );
}
