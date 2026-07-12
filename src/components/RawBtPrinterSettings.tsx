"use client";

import { useEffect, useState } from "react";
import { Printer, Check, ExternalLink, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { getRawBtEnabled, setRawBtEnabled, rawbtTestPrint } from "@/lib/qz-print";

export function RawBtPrinterSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setEnabled(getRawBtEnabled());
    setLoaded(true);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setRawBtEnabled(next);
  }

  function test() {
    setTesting(true);
    try {
      rawbtTestPrint();
      toast.success("Test slip sent to RawBT");
    } finally {
      setTimeout(() => setTesting(false), 800);
    }
  }

  if (!loaded) return null;

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <h2 className="section-title">Thermal Printer (RawBT / Android)</h2>
          <p className="section-subtitle">
            For billing on an Android device (e.g. a Sunmi terminal) with a USB or Bluetooth receipt
            printer. Configured per device.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Enable toggle */}
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div>
            <p className="font-semibold text-foreground text-sm">Use RawBT for printing</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When off, bills print through the normal browser dialog (unchanged).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={toggle}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-muted border border-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        {/* Test */}
        <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
          <button
            type="button"
            onClick={test}
            disabled={testing}
            className="btn btn-primary w-full sm:w-auto"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {testing ? "Sending…" : "Print Test Slip"}
          </button>
          <p className="text-xs text-muted-foreground mt-1.5">
            RawBT gives no confirmation back to this page — check the printer (or RawBT&apos;s own
            notification) to see if the test slip came through.
          </p>
        </div>

        {/* Help */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> One-time setup on this device
          </p>
          <p>
            1. Install the RawBT print service app.{" "}
            <a
              href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
            >
              Play Store <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p>
            2. Open RawBT, add your printer (USB/Bluetooth/Wi-Fi) and grant the USB permission when
            Android asks.
          </p>
          <p>3. Turn on the toggle above, then tap “Print Test Slip”.</p>
          <p>
            4. The first time, Android may ask which app should open the link — pick RawBT and choose
            “Always”.
          </p>
        </div>
      </div>
    </section>
  );
}
