"use client";

import { Bell, Search, LogOut, Menu, Store } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { setActiveBranch } from "@/app/actions/branches";

export function Header({
  onOpenSidebar,
  hamburgerClass,
  branches = [],
  activeBranchId,
}: {
  onOpenSidebar?: () => void;
  hamburgerClass?: string;
  branches?: any[];
  activeBranchId?: number | null;
}) {
  return (
    <header
      className="h-14 flex items-center px-5 gap-3 print:hidden sticky top-0 z-30 flex-shrink-0"
      style={{
        background: "var(--header-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}
    >
      {/* Hamburger / Menu Toggle */}
      {hamburgerClass && (
        <button
          suppressHydrationWarning
          onClick={onOpenSidebar}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${hamburgerClass}`}
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)";
          }}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Search Bar */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg transition-all outline-none"
            style={{
              background: "var(--muted)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.border = "1px solid var(--primary)";
              (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.border = "1px solid var(--border)";
              (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        {/* Branch Switcher (Admin Only) */}
        {branches && branches.length > 0 && (
          <div className="flex items-center mr-2">
            <Store className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <select
              suppressHydrationWarning
              value={activeBranchId || branches[0]?.id || ""}
              onChange={(e) => setActiveBranch(Number(e.target.value))}
              className="bg-transparent text-sm font-medium outline-none cursor-pointer"
              style={{ color: "var(--foreground)" }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-background">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Theme Toggle */}
        <div className="flex-shrink-0">
          <ThemeToggle />
        </div>

        {/* Notification Bell */}
        <button
          suppressHydrationWarning
          className="relative p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)";
          }}
        >
          <Bell style={{ width: "1.125rem", height: "1.125rem" }} />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
            style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.8)" }}
          />
        </button>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

        {/* User Avatar + Name */}
        <div className="flex items-center gap-2.5 pl-0.5">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
              boxShadow: "0 0 12px rgba(139,92,246,0.4)",
            }}
          >
            A
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold leading-none" style={{ color: "var(--foreground)" }}>
              Admin
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Administrator
            </p>
          </div>

          {/* Logout */}
          <button
            suppressHydrationWarning
            onClick={() => logout()}
            className="ml-1 p-1.5 rounded-lg transition-colors"
            title="Sign out"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)";
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
