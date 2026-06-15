"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Settings,
  Store,
  ShoppingCart,
  AlertTriangle,
  Users,
  Receipt,
  PackagePlus,
  ChevronRight,
  Briefcase,
  BookOpen,
  X,
} from "lucide-react";

const allNavItems = [
  { name: "Billing", href: "/billing", icon: ShoppingCart, color: "text-emerald-400", glow: "rgba(16,185,129,0.15)" },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-violet-400", glow: "rgba(139,92,246,0.15)" },
  { name: "Customers", href: "/customers", icon: Users, color: "text-sky-400", glow: "rgba(56,189,248,0.15)" },
  { name: "Products", href: "/products", icon: Package, color: "text-indigo-400", glow: "rgba(99,102,241,0.15)" },
  { name: "Inventory", href: "/inventory", icon: AlertTriangle, color: "text-amber-400", glow: "rgba(245,158,11,0.15)" },
  { name: "Purchases", href: "/purchases", icon: PackagePlus, color: "text-teal-400", glow: "rgba(20,184,166,0.15)" },
  { name: "Expenses", href: "/expenses", icon: Receipt, color: "text-rose-400", glow: "rgba(251,113,133,0.15)" },
  { name: "Shifts", href: "/shifts", icon: Store, color: "text-orange-400", glow: "rgba(251,146,60,0.15)" },
  { name: "Reports", href: "/reports", icon: BarChart3, color: "text-pink-400", glow: "rgba(232,121,249,0.15)" },
  { name: "Tally", href: "/tally", icon: BookOpen, color: "text-purple-400", glow: "rgba(192,132,252,0.15)" },
  { name: "Staff", href: "/staff", icon: Briefcase, color: "text-cyan-400", glow: "rgba(34,211,238,0.15)" },
  { name: "Settings", href: "/settings", icon: Settings, color: "text-slate-400", glow: "rgba(148,163,184,0.1)" },
];

export function Sidebar({
  userRole,
  onClose,
  showClose,
}: {
  userRole?: string;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const pathname = usePathname();

  const navItems =
    userRole === "Admin"
      ? allNavItems
      : allNavItems.filter(
          (item) =>
            item.name === "Billing" ||
            item.name === "Customers" ||
            item.name === "Shifts"
        );

  const mainItems = navItems.filter((i) => i.name !== "Settings");
  const bottomItems = navItems.filter((i) => i.name === "Settings");

  return (
    <aside
      className="flex flex-col h-full w-64 print:hidden z-40 relative"
      style={{
        background: "linear-gradient(180deg, #0e0e14 0%, #111118 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Close Button */}
      {showClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Logo */}
      <div
        className="flex items-center gap-3 h-[4rem] px-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            boxShadow: "0 0 16px rgba(139,92,246,0.5)",
          }}
        >
          <Store className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm tracking-tight leading-none">
            BillingSystem
          </p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "#8b5cf6" }}>
            Enterprise
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 pt-4 pb-2 scrollbar-thin gap-0.5">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] mb-2.5" style={{ color: "#3d3d5c" }}>
          Navigation
        </p>

        <nav className="flex flex-col gap-0.5">
          {mainItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? item.glow : "transparent",
                  color: isActive ? "#f0f0f5" : "#7070a0",
                  borderLeft: isActive
                    ? `2px solid ${item.color.replace("text-", "").replace("-400", "")}`
                    : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#c8c8d8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#7070a0";
                  }
                }}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    isActive ? item.color : "text-[#3d3d5c] group-hover:text-slate-400"
                  }`}
                />
                <span className="flex-1 truncate">{item.name}</span>
                {isActive && (
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 ${item.color} opacity-60`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        {bottomItems.length > 0 && (
          <>
            <div className="my-3 mx-1" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
            <nav className="flex flex-col gap-0.5">
              {bottomItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? item.glow : "transparent",
                      color: isActive ? "#f0f0f5" : "#7070a0",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          "transparent";
                    }}
                  >
                    <item.icon
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? item.color : "text-[#3d3d5c] group-hover:text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* User Badge */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #22d3ee)" }}
          >
            {userRole === "Admin" ? "A" : "C"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#e0e0f0" }}>
              {userRole === "Admin" ? "Administrator" : "Cashier"}
            </p>
            <p className="text-xs truncate" style={{ color: "#5c5c72" }}>
              {userRole === "Admin" ? "Full access" : "Limited access"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
