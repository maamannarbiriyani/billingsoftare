"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* installability is best-effort — a failed registration shouldn't break the app */
      });
    }
  }, []);
  return null;
}
