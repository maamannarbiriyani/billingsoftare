"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  Home,
  ReceiptText,
  List,
  Layers,
  Clock,
  LayoutList,
  CalendarDays,
  CalendarRange,
} from "lucide-react";

// Mobile drawer = a focused Reports app (matches the owner's phone workflow).
// Billing / Inventory / Staff etc. stay on the desktop sidebar only.
const reportNav = [
  { name: "Home", type: null as string | null, href: "/dashboard", icon: Home },
  { name: "Sales Report", type: "sales", href: "/reports?type=sales", icon: ReceiptText },
  { name: "Item Wise Sales Report", type: "items", href: "/reports?type=items", icon: List },
  { name: "Item Sales Report", type: "itemsales", href: "/reports?type=itemsales", icon: Package },
  { name: "Consolidated Category Report", type: "category", href: "/reports?type=category", icon: Layers },
  { name: "Hourly Sales Report", type: "hourly", href: "/reports?type=hourly", icon: Clock },
  { name: "Category Item Wise Sales Report", type: "categoryitems", href: "/reports?type=categoryitems", icon: LayoutList },
  { name: "Day Wise Sales Report", type: "daywise", href: "/reports?type=daywise", icon: CalendarDays },
  { name: "Monthly Sales Report", type: "monthly", href: "/reports?type=monthly", icon: CalendarRange },
];

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

// Desktop sidebar grouped by what the task actually is, so related tools sit
// together instead of one long flat list.
const NAV_GROUPS: { label: string; items: string[] }[] = [
  { label: "Operations", items: ["Billing", "Dashboard", "Reports"] },
  { label: "Catalog & Stock", items: ["Products", "Inventory", "Purchases"] },
  { label: "People", items: ["Customers", "Staff", "Shifts"] },
  { label: "Finance", items: ["Expenses", "Tally"] },
];

const navByName = Object.fromEntries(allNavItems.map((i) => [i.name, i]));

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
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") || "sales";
  const isAdmin = userRole === "Admin";

  function reportActive(item: { type: string | null }) {
    if (item.type === null) return pathname === "/dashboard";
    return pathname.startsWith("/reports") && currentType === item.type;
  }

  const navItems =
    userRole === "Admin"
      ? allNavItems
      : allNavItems.filter(
          (item) =>
            item.name === "Billing" ||
            item.name === "Customers" ||
            item.name === "Shifts" ||
            item.name === "Staff"
        );

  const mainItems = navItems.filter((i) => i.name !== "Settings");
  const bottomItems = navItems.filter((i) => i.name === "Settings");

  const renderItem = (item: (typeof allNavItems)[number]) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.name}
        href={item.href}
        className="group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        style={{
          background: isActive ? "var(--sidebar-active-bg)" : "transparent",
          color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
          borderLeft: isActive ? `2px solid var(--sidebar-active-border)` : "2px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--sidebar-hover-bg)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--sidebar-text-active)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--sidebar-text)";
          }
        }}
      >
        <item.icon
          className={`h-4 w-4 flex-shrink-0 transition-colors ${
            isActive ? "text-sidebar-text-active" : "text-sidebar-text group-hover:text-sidebar-text-active"
          }`}
        />
        <span className="flex-1 truncate">{item.name}</span>
        {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-60" />}
      </Link>
    );
  };

  return (
    <aside
      className="flex flex-col h-full w-64 print:hidden z-40 relative"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
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
      <div className="flex h-[4rem] items-center gap-3 px-4 flex-shrink-0 border-b border-sidebar-border bg-sidebar-bg/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm overflow-hidden">
          <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-sidebar-text-active font-bold text-sm tracking-tight leading-none">
            Hotel Maamannar
          </p>
          <p className="text-[11px] font-medium mt-0.5 text-primary">
            Biriyani
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 pt-4 pb-2 scrollbar-thin gap-0.5">
        {/* MOBILE: focused Reports menu (Admin only) */}
        {isAdmin && (
          <div className="md:hidden flex flex-col gap-0.5 mb-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] mb-2.5 text-sidebar-text opacity-70">
              Reports
            </p>
            <nav className="flex flex-col gap-0.5">
              {reportNav.map((item) => {
                const isActive = reportActive(item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? "var(--sidebar-active-bg)" : "transparent",
                      color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                      borderLeft: isActive
                        ? `2px solid var(--sidebar-active-border)`
                        : "2px solid transparent",
                    }}
                  >
                    <item.icon
                      className={`h-4 w-4 flex-shrink-0 ${
                        isActive
                          ? "text-sidebar-text-active"
                          : "text-sidebar-text group-hover:text-sidebar-text-active"
                      }`}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-60" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* DESKTOP (and non-admin mobile): full navigation */}
        {isAdmin ? (
          <div className="hidden md:flex flex-col gap-0.5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="px-2 mt-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sidebar-text opacity-70">
                  {group.label}
                </p>
                <nav className="flex flex-col gap-0.5">
                  {group.items.map((name) => navByName[name]).filter(Boolean).map(renderItem)}
                </nav>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] mb-2.5 text-sidebar-text opacity-70">
              Navigation
            </p>
            <nav className="flex flex-col gap-0.5">{mainItems.map(renderItem)}</nav>
          </>
        )}

        {/* Settings */}
        {bottomItems.length > 0 && (
          <>
            <div className="my-3 mx-1" style={{ height: "1px", background: "var(--sidebar-border)" }} />
            <nav className="flex flex-col gap-0.5">
              {bottomItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? "var(--sidebar-active-bg)" : "transparent",
                      color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
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
                        isActive ? "text-sidebar-text-active" : "text-sidebar-text group-hover:text-sidebar-text-active"
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
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--sidebar-border)" }}
        >
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0"
            style={{ background: "var(--primary)" }}
          >
            {userRole === "Admin" ? "A" : "C"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-sidebar-text-active">
              {userRole === "Admin" ? "Administrator" : "Cashier"}
            </p>
            <p className="text-xs truncate text-sidebar-text">
              {userRole === "Admin" ? "Full access" : "Limited access"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
