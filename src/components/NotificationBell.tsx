"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell, AlertTriangle, PackageX, Wallet, Bike, FileWarning, Store, CheckCheck, X,
} from "lucide-react";
import { getNotifications, type AppNotification } from "@/app/actions/notifications";

const READ_KEY = "notif_read_ids";

const ICONS: Record<AppNotification["type"], React.ElementType> = {
  stock: PackageX,
  khata: Wallet,
  purchase: FileWarning,
  online: Bike,
  shift: Store,
};

const SEVERITY: Record<AppNotification["severity"], { color: string; bg: string }> = {
  danger: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  info: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
};

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function NotificationBell() {
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const data = await getNotifications();
    setNotes(data);
    // Drop read IDs that no longer exist so the list stays clean
    setReadIds((prev) => {
      const live = new Set(data.map((n) => n.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      if (typeof window !== "undefined") {
        localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    setReadIds(loadReadIds());
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Close on outside click (button + portaled panel both count as "inside")
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = notes.filter((n) => !readIds.has(n.id));
  const unreadCount = unread.length;

  const markAllRead = () => {
    const all = new Set(notes.map((n) => n.id));
    setReadIds(all);
    if (typeof window !== "undefined") {
      localStorage.setItem(READ_KEY, JSON.stringify([...all]));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        suppressHydrationWarning
        onClick={() => setOpen((o) => !o)}
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
        aria-label="Notifications"
      >
        <Bell style={{ width: "1.125rem", height: "1.125rem" }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.7)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel is portaled to <body> so it never gets trapped behind the
          header's stacking context or page sticky bars. */}
      {mounted &&
        open &&
        createPortal(
          <>
            {/* Tap-away layer (mainly for mobile) */}
            <div
              className="fixed inset-0 z-[90]"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={panelRef}
              className="fixed top-[3.75rem] right-2 sm:right-4 w-[calc(100vw-1rem)] sm:w-96 max-w-[24rem] rounded-xl overflow-hidden z-[100] animate-fade-in"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 16px 40px -12px rgba(0,0,0,0.45)",
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:opacity-80"
                      style={{ color: "var(--primary)" }}
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-md transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
                      style={{ background: "var(--muted)" }}
                    >
                      <CheckCheck className="h-6 w-6" style={{ color: "#10b981" }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      All caught up
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      No pending alerts right now.
                    </p>
                  </div>
                ) : (
                  notes.map((n) => {
                    const Icon = ICONS[n.type] || AlertTriangle;
                    const sev = SEVERITY[n.severity];
                    const isRead = readIds.has(n.id);
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--muted)]"
                        style={{ borderBottom: "1px solid var(--border)", opacity: isRead ? 0.6 : 1 }}
                      >
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: sev.bg, color: sev.color }}
                        >
                          <Icon style={{ width: "1.05rem", height: "1.05rem" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                            {n.title}
                          </p>
                          <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--muted-foreground)" }}>
                            {n.description}
                          </p>
                        </div>
                        {!isRead && (
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: "var(--primary)" }}
                          />
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
