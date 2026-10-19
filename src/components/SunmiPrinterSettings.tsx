"use client";

import { useEffect, useState } from "react";
import { Printer, Loader2, Zap, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { isNativeApp, isSunmiAvailable, printSunmiRaw } from "@/lib/native-usb-print";
import { buildBillEscPos } from "@/lib/qz-print";

/** Shown only inside the native app shell — irrelevant in a browser tab. */
export function SunmiPrinterSettings() {
  const [native, setNative] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
    setLoaded(true);
    if (isNativeApp()) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check() {
    setChecking(true);
    try {
      setAvailable(await isSunmiAvailable());
    } finally {
      setChecking(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const slip = await buildBillEscPos({
        storeName: "TEST OK",
        invoiceNumber: "SUNMI-TEST",
        items: [{ name: "Sunmi built-in printer", price: 0, qty: 1 }],
        subtotal: 0,
        total: 0,
      });
      await printSunmiRaw(slip);
      toast.success("Test slip sent to the built-in printer");
    } catch (e) {
      console.error(e);
      toast.error("Test print failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTesting(false);
    }
  }

  if (!loaded || !native) return null;

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <h2 className="section-title">Thermal Printer (Sunmi built-in)</h2>
          <p className="section-subtitle">
            For a Sunmi terminal&apos;s own internal printer — used automatically, ahead of any USB
            printer, when detected.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
          ) : available ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-foreground flex-1">
            {checking
              ? "Checking for built-in printer…"
              : available
                ? "Built-in printer detected"
                : "No built-in printer detected — not a Sunmi device, or the printer SDK isn't reachable"}
          </span>
          <button type="button" onClick={check} disabled={checking} className="text-xs font-semibold text-primary hover:underline">
            <RefreshCw className="h-3 w-3 inline mr-1" />
            Recheck
          </button>
        </div>

        <button
          type="button"
          onClick={test}
          disabled={testing || !available}
          className="btn btn-primary w-full sm:w-auto"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          {testing ? "Printing…" : "Print Test Slip"}
        </button>
      </div>
    </section>
  );
}
