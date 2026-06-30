"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  fallback = "/reports",
  className = "inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors",
  label = "Back",
}: {
  fallback?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();

  function goBack() {
    // Prefer returning to where the user came from (e.g. Reports with its
    // active tab + date filter, or the Invoice list). Fall back to a sensible
    // page when there's no history (deep link / fresh tab).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button onClick={goBack} className={className}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
