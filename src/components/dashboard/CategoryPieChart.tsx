'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = [
  { bg: '#4f46e5', light: '#ede9fe' },
  { bg: '#10b981', light: '#d1fae5' },
  { bg: '#f59e0b', light: '#fef3c7' },
  { bg: '#ef4444', light: '#fee2e2' },
  { bg: '#8b5cf6', light: '#ede9fe' },
  { bg: '#ec4899', light: '#fce7f3' },
  { bg: '#06b6d4', light: '#cffafe' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-sm shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-slate-700">
        <p className="font-bold">{payload[0].name}</p>
        <p className="text-slate-300 text-xs">{payload[0].value} items sold</p>
      </div>
    );
  }
  return null;
};

export function CategoryPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 select-none">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <p className="text-sm font-medium">No category data yet</p>
        <p className="text-xs mt-1">Sales by category will show here</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const topCategory = data.length > 0 ? data[0] : null;
  const topPct = topCategory && total > 0 ? Math.round((topCategory.value / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Donut Chart */}
      <div className="h-[200px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={67}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length].bg} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        {topCategory && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center pt-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Top</span>
            <span className="text-sm font-black text-foreground max-w-[80px] truncate leading-tight mt-0.5">{topCategory.name}</span>
            <span className="text-lg font-black text-indigo-500 mt-0.5 leading-none">{topPct}%</span>
          </div>
        )}
      </div>

      {/* Legend List */}
      <div className="space-y-2">
        {data.slice(0, 5).map((entry, index) => {
          const color = COLORS[index % COLORS.length];
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color.bg }} />
              <span className="text-sm text-slate-700 flex-1 truncate font-medium">{entry.name}</span>
              <span className="text-xs font-bold text-slate-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
