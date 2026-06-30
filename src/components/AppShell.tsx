"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export function AppShell({
  children,
  userRole,
  branches = [],
  activeBranchId = null,
}: {
  children: React.ReactNode;
  userRole: string;
  branches?: any[];
  activeBranchId?: number | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const isBilling = pathname?.startsWith("/billing");
  const isReports = pathname?.startsWith("/reports");

  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on navigation — including switching report type, which only
  // changes the query string (pathname stays /reports).
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, queryString]);

  const hamburgerClass = isBilling ? "block" : "block md:hidden";

  return (
    <div className="relative z-10 flex h-screen overflow-hidden w-full">
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out ${
          isBilling
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : isOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          userRole={userRole}
          onClose={() => setIsOpen(false)}
          showClose={isOpen}
        />
      </div>

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 h-screen w-full min-w-0 transition-all duration-300 ease-in-out ${
          !isBilling ? "md:pl-64" : ""
        }`}
      >
        <Header
          onOpenSidebar={() => setIsOpen(true)}
          hamburgerClass={hamburgerClass}
          branches={branches}
          activeBranchId={activeBranchId}
        />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
          style={{ background: "var(--background)" }}
        >
          {isBilling ? (
            <div className="h-full w-full">{children}</div>
          ) : isReports ? (
            // Reports manages its own padding (mobile card layout)
            <div className="min-h-full">{children}</div>
          ) : (
            <div className="py-4 px-3 sm:py-6 sm:px-7 lg:px-8 print:py-0 print:px-0 max-w-screen-2xl mx-auto">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
