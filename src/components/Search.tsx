"use client";

import { Search as SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect, useRef } from "react";

export function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  const [term, setTerm] = useState(searchParams.get("query") || "");
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      startTransition(() => {
        // Use window.location.search to avoid dependency on searchParams object which changes reference
        const params = new URLSearchParams(window.location.search);
        params.set("page", "1"); // reset page on new search
        if (term) {
          params.set("query", term);
        } else {
          params.delete("query");
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [term, pathname, replace]);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-gray-300  bg-card  py-2 pl-10 text-sm outline-2 placeholder:text-gray-500 text-gray-900 "
        placeholder={placeholder}
        onChange={(e) => setTerm(e.target.value)}
        value={term}
      />
      <SearchIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
