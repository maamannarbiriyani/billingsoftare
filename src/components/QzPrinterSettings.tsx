"use client";

import { useEffect, useState } from "react";
import {
  Printer,
  Check,
  RefreshCw,
  Zap,
  ExternalLink,
  Loader2,
  Wifi,
  WifiOff,
  Plug,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getQzConfig,
  setQzConfig,
  qzTestConnection,
  qzListPrinters,
  qzGetPrinterStatus,
  pickReceiptPrinter,
  qzTestPrint,
  type QzConfig,
  type PrinterStatus,
} from "@/lib/qz-print";

type ConnStatus = "unknown" | "checking" | "connected" | "unreachable";

export function QzPrinterSettings() {
  const [cfg, setCfg] = useState<QzConfig>({ enabled: false, printer: "", kickDrawer: false });
  const [printers, setPrinters] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<ConnStatus>("unknown");
  const [connError, setConnError] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [checkingPrinter, setCheckingPrinter] = useState(false);

  useEffect(() => {
    const c = getQzConfig();
    setCfg(c);
    setLoaded(true);
    // Only probe automatically if the user has already opted in, so we don't
    // pop QZ's "Allow" prompt for people who haven't enabled it.
    if (c.enabled) {
      checkConnection();
      scan(c.printer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkConnection() {
    setStatus("checking");
    const r = await qzTestConnection();
    setStatus(r.ok ? "connected" : "unreachable");
    setConnError(r.ok ? null : r.error ?? null);
    return r.ok;
  }

  function update(patch: Partial<QzConfig>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    setQzConfig(patch); // persist immediately (per-terminal, localStorage)
  }

  // `currentPrinter` is passed explicitly (rather than read from `cfg`) so
  // this can be called right after enabling, before the `cfg` state update
  // from that toggle has settled — avoids a stale-closure race.
  async function scan(currentPrinter?: string, opts: { silent?: boolean } = {}) {
    setScanning(true);
    try {
      const list = await qzListPrinters();
      setPrinters(list);
      setStatus("connected");
      const selected = currentPrinter ?? cfg.printer;
      if (list.length === 0) {
        if (!opts.silent) toast.error("QZ Tray connected, but no printers found");
      } else {
        if (!opts.silent) toast.success(`Found ${list.length} printer${list.length !== 1 ? "s" : ""}`);
        // Auto-pick the RP326 (or another receipt printer) if none chosen yet
        if (!selected) {
          const guess = pickReceiptPrinter(list);
          if (guess) {
            update({ printer: guess });
            if (!opts.silent) toast.success(`Auto-selected "${guess}"`);
            checkPrinterStatus(guess);
            return;
          }
        }
      }
      if (selected) checkPrinterStatus(selected);
      setConnError(null);
    } catch (e) {
      console.error(e);
      setStatus("unreachable");
      const msg = e instanceof Error ? e.message : String(e);
      setConnError(msg);
      if (!opts.silent) toast.error("Could not reach QZ Tray: " + msg);
    } finally {
      setScanning(false);
    }
  }

  async function checkPrinterStatus(printerName?: string) {
    const name = printerName ?? cfg.printer;
    if (!name) {
      setPrinterStatus(null);
      return;
    }
    setCheckingPrinter(true);
    try {
      const s = await qzGetPrinterStatus(name);
      setPrinterStatus(s);
    } finally {
      setCheckingPrinter(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      await qzTestPrint(cfg.printer, cfg.kickDrawer);
      setStatus("connected");
      toast.success("Test slip sent to printer");
      checkPrinterStatus();
    } catch (e) {
      console.error(e);
      toast.error("Test print failed. Check QZ Tray and the selected printer.");
      checkPrinterStatus();
    } finally {
      setTesting(false);
    }
  }

  if (!loaded) return null;

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <h2 className="section-title">Thermal Printer (QZ Tray)</h2>
          <p className="section-subtitle">
            Silent, direct ESC/POS printing to a USB receipt printer (e.g. RP326). Configured per
            billing machine.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Connection status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {status === "connected" ? (
              <Wifi className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : status === "unreachable" ? (
              <WifiOff className="h-4 w-4 text-rose-500 flex-shrink-0" />
            ) : status === "checking" ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
            ) : (
              <Plug className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm font-semibold text-foreground">
              {status === "connected"
                ? "QZ Tray connected"
                : status === "unreachable"
                ? "QZ Tray not reachable"
                : status === "checking"
                ? "Checking QZ Tray…"
                : "QZ Tray status unknown"}
            </span>
          </div>
          <button
            type="button"
            onClick={checkConnection}
            disabled={status === "checking"}
            className="btn btn-secondary btn-sm w-full sm:w-auto"
          >
            Test Connection
          </button>
        </div>
        {status === "unreachable" && (
          <div className="text-xs text-rose-500 -mt-2 space-y-1">
            <p>
              QZ Tray must be installed and running (look for its icon in the Windows system tray). On
              an HTTPS site the first connection may ask you to trust QZ&apos;s certificate — click
              Allow / Trust.
            </p>
            {connError && (
              <p className="font-mono bg-rose-500/10 rounded px-2 py-1 break-all">
                Error detail: {connError}
              </p>
            )}
          </div>
        )}

        {/* Enable toggle */}
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div>
            <p className="font-semibold text-foreground text-sm">Use QZ Tray for printing</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When off, bills print through the normal browser dialog (unchanged).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.enabled}
            onClick={() => {
              const next = !cfg.enabled;
              update({ enabled: next });
              if (next) {
                checkConnection();
                scan(cfg.printer, { silent: true });
              }
            }}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              cfg.enabled ? "bg-primary" : "bg-muted border border-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                cfg.enabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        {/* Printer selection */}
        <div className={cfg.enabled ? "" : "opacity-50 pointer-events-none"}>
          <label className="input-label">Receipt Printer</label>
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <select
              value={cfg.printer}
              onChange={(e) => {
                update({ printer: e.target.value });
                checkPrinterStatus(e.target.value);
              }}
              className="input-field flex-1"
            >
              <option value="">System default printer</option>
              {printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {cfg.printer && !printers.includes(cfg.printer) && (
                <option value={cfg.printer}>{cfg.printer}</option>
              )}
            </select>
            <button
              type="button"
              onClick={() => scan()}
              disabled={scanning}
              className="btn btn-secondary whitespace-nowrap w-full sm:w-auto"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {scanning ? "Scanning…" : "Find Printers"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Click “Find Printers” to load printers from QZ Tray on this machine.
          </p>

          {/* Live printer status */}
          {cfg.printer && (
            <div className="flex items-center gap-2 mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
              {checkingPrinter ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
              ) : printerStatus?.online === true ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : printerStatus?.online === false ? (
                <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              ) : (
                <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-xs font-semibold text-foreground flex-1 truncate">
                {checkingPrinter
                  ? "Checking printer…"
                  : printerStatus?.online === true
                  ? "Printer Ready"
                  : printerStatus?.online === false
                  ? `Printer Offline — ${printerStatus.detail}`
                  : "Status unknown"}
              </span>
              <button
                type="button"
                onClick={() => checkPrinterStatus()}
                className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
              >
                Refresh
              </button>
            </div>
          )}

          {/* Cash drawer */}
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.kickDrawer}
              onChange={(e) => update({ kickDrawer: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Open cash drawer on cash payments</span>
          </label>

          {/* Test */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={test}
              disabled={testing}
              className="btn btn-primary w-full sm:w-auto"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {testing ? "Printing…" : "Print Test Slip"}
            </button>
          </div>
        </div>

        {/* Help */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> One-time setup on this PC
          </p>
          <p>
            1. Install QZ Tray and keep it running in the system tray.{" "}
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
            >
              Download <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p>2. Turn on the toggle above, click “Find Printers”, and pick your RP326.</p>
          <p>3. Click “Print Test Slip”. The first print shows a QZ “Allow” prompt — tick “Remember”.</p>
          <p className="font-semibold text-foreground pt-1">
            Seeing “Request blocked” or asked to Allow every time?
          </p>
          <p>
            QZ Tray remembered a stale decision for this site. Right-click the QZ icon in the system
            tray → <strong>Advanced</strong> → <strong>Site Manager</strong>, remove the entry for
            this website, then click “Print Test Slip” again and tick “Remember this decision” on the
            new prompt.
          </p>
        </div>
      </div>
    </section>
  );
}
