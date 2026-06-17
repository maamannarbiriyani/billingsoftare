"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function CategoryFilter({ categories }: { categories: string[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentCategory = searchParams.get("category") || "";

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams);
      if (e.target.value) {
        params.set("category", e.target.value);
      } else {
        params.delete("category");
      }
      params.delete("page"); // Reset page when category changes
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <select
      value={currentCategory}
      onChange={handleCategoryChange}
      className="h-10 px-3 py-2 rounded-xl bg-secondary border border-border text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
    >
      <option value="">All Categories</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
