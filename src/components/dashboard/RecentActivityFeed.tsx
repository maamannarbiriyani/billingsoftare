"use client";

import { formatDistanceToNow } from "date-fns";

export type ActivityItem = {
  id: string;
  type: "INVOICE" | "EXPENSE" | "SHIFT" | "ALERT";
  title: string;
  timestamp: Date;
  status: "success" | "warning" | "info";
};

export function RecentActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="space-y-1 pr-2 max-h-[350px] overflow-y-auto scrollbar-thin">
      {activities.map((activity, i) => (
        <div 
          key={activity.id} 
          className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors animate-slide-in-left" 
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="mt-1.5 flex-shrink-0">
            {activity.status === "success" && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
            {activity.status === "warning" && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
            {activity.status === "info" && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
               {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No recent activity
        </div>
      )}
    </div>
  );
}
