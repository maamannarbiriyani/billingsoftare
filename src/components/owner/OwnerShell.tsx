"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ownerLogout } from "@/app/owner/actions";
import {
  LayoutDashboard, Receipt, BarChart2, GitBranch, Package,
  Users, Wallet, UserCircle, Settings, LogOut, Menu, X, BarChart3,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { label: "Dashboard",  href: "/owner",           icon: LayoutDashboard },
  { label: "Billing",    href: "/owner/billing",    icon: Receipt },
  { label: "Reports",    href: "/owner/reports",    icon: BarChart2 },
  { label: "Branches",   href: "/owner/branches",   icon: GitBranch },
  { label: "Products",   href: "/owner/products",   icon: Package },
  { label: "Staff",      href: "/owner/staff",      icon: Users },
  { label: "Expenses",   href: "/owner/expenses",   icon: Wallet },
  { label: "Customers",  href: "/owner/customers",  icon: UserCircle },
  { label: "Settings",   href: "/owner/settings",   icon: Settings },
];

const BOTTOM_NAV = NAV.slice(0, 5);

function NavItem({ item, active, onClick }: { item: typeof NAV[0]; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <item.icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
      {item.label}
      {active && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
    </Link>
  );
}

export function OwnerShell({ children, storeName }: { children: React.ReactNode; storeName: string }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/owner") return pathname === "/owner";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{storeName}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Owner Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <form action={ownerLogout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 truncate max-w-[160px]">{storeName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Owner Portal</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} onClick={() => setDrawerOpen(false)} />
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <form action={ownerLogout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60">
        {/* Top header (mobile) */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm truncate">{storeName}</span>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 px-6 py-3 items-center justify-between sticky top-0 z-20">
          <div />
          <form action={ownerLogout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </form>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* ── Mobile Bottom Nav (top 5 items) ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-20 safe-area-bottom">
          {BOTTOM_NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center gap-1 py-2 text-center transition-colors"
              >
                <item.icon
                  className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-400"}`}
                />
                <span className={`text-[9px] font-semibold uppercase tracking-wide ${active ? "text-blue-600" : "text-slate-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
