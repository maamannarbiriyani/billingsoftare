"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return;
    // Autofill/password-manager extensions add `fdprocessedid` to inputs and
    // buttons before React hydrates. That mismatch is harmless, so skip it —
    // any other hydration mismatch is still reported.
    if (
      typeof args[0] === 'string' &&
      args[0].includes('hydrated but some attributes') &&
      args.some((a) => typeof a === 'string' && a.includes('fdprocessedid')) &&
      !args.some((a) => typeof a === 'string' && /^[-+]\s+(?!fdprocessedid)\S+=/m.test(a))
    ) {
      return;
    }
    orig.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
