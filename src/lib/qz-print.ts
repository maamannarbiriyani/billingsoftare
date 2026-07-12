"use client";

// ─────────────────────────────────────────────────────────────
// QZ Tray raw ESC/POS printing for the RP326 (and any ESC/POS
// thermal printer), with automatic fallback to the browser HTML
// print in src/lib/print.ts.
//
// Flow:  Next.js (browser) ──ws──► QZ Tray (Windows) ──USB──► RP326
//
// SAFETY: this is OPT-IN. Until the user enables it in Settings
// (localStorage flag), and if QZ isn't running or errors, every
// call falls back to the existing browser print — so nothing about
// current printing changes unless QZ is turned on and reachable.
// ─────────────────────────────────────────────────────────────

import {
  printReceipt,
  buildBillHtml,
  buildKotHtml,
  absUrl,
  type BillData,
  type KotHtmlData,
} from "@/lib/print";
import { toast } from "sonner";
import { isNativeApp, printUsbRaw } from "@/lib/native-usb-print";

// ── Per-terminal config (each billing machine has its own printer) ──
const LS_ENABLED = "qz_enabled";
const LS_PRINTER = "qz_printer";
const LS_DRAWER = "qz_drawer";

export type QzConfig = { enabled: boolean; printer: string; kickDrawer: boolean };

export function getQzConfig(): QzConfig {
  if (typeof window === "undefined") return { enabled: false, printer: "", kickDrawer: false };
  return {
    enabled: localStorage.getItem(LS_ENABLED) === "1",
    printer: localStorage.getItem(LS_PRINTER) || "",
    kickDrawer: localStorage.getItem(LS_DRAWER) === "1",
  };
}

export function setQzConfig(cfg: Partial<QzConfig>) {
  if (typeof window === "undefined") return;
  if (cfg.enabled !== undefined) localStorage.setItem(LS_ENABLED, cfg.enabled ? "1" : "0");
  if (cfg.printer !== undefined) localStorage.setItem(LS_PRINTER, cfg.printer);
  if (cfg.kickDrawer !== undefined) localStorage.setItem(LS_DRAWER, cfg.kickDrawer ? "1" : "0");
}

// ── Lazy-load the qz-tray client (browser only) ──────────────────
let qzPromise: Promise<any> | null = null;
async function loadQz(): Promise<any> {
  if (!qzPromise) {
    qzPromise = import("qz-tray").then((m: any) => m.default || m);
  }
  return qzPromise;
}

let securityReady = false;
async function setupSecurity(qz: any) {
  if (securityReady) return;
  securityReady = true;
  // Signed mode (silent, no prompt) if a certificate is configured on the
  // server; otherwise QZ runs unsigned and shows a one-time "Allow" prompt.
  try {
    const cert = await fetch("/api/qz/cert").then((r) => (r.ok ? r.text() : "")).catch(() => "");
    if (cert && cert.trim()) {
      qz.security.setCertificatePromise((resolve: any) => resolve(cert));
      qz.security.setSignatureAlgorithm?.("SHA512");
      qz.security.setSignaturePromise((toSign: string) => (resolve: any, reject: any) => {
        fetch("/api/qz/sign?request=" + encodeURIComponent(toSign))
          .then((r) => r.text())
          .then(resolve)
          .catch(reject);
      });
    }
  } catch {
    /* unsigned mode */
  }
}

// Single-flight connect: if a bill and a KOT try to print at the same
// moment, both would otherwise call qz.websocket.connect() concurrently.
// QZ Tray can only negotiate one handshake at a time, so the second call
// gets rejected as "Request blocked" and neither prompt ever gets a clean
// "Allow" — which is also why it kept re-prompting. Reusing one in-flight
// connect promise fixes both.
let connectingPromise: Promise<any> | null = null;

async function ensureConnected(): Promise<any> {
  const qz = await loadQz();
  if (qz.websocket.isActive()) return qz;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      await setupSecurity(qz);
      // Race the connect against a timeout so a missing QZ Tray fails fast.
      await Promise.race([
        qz.websocket.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("QZ connect timeout")), 4000)),
      ]);
      return qz;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

/** True when we can reach QZ Tray right now (used by the settings screen). */
export async function qzIsAvailable(): Promise<boolean> {
  const r = await qzTestConnection();
  return r.ok;
}

/** Like qzIsAvailable(), but also returns the actual failure reason so the
 *  Settings screen can show it directly — without this, "unreachable" gave
 *  no clue whether QZ wasn't running, a certificate was untrusted, a
 *  firewall blocked it, etc., and getting that detail required opening the
 *  browser console, which isn't always practical to walk someone through. */
export async function qzTestConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureConnected();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** List installed printers via QZ (settings screen). */
export async function qzListPrinters(): Promise<string[]> {
  const qz = await ensureConnected();
  const found = await qz.printers.find();
  return Array.isArray(found) ? found : [found].filter(Boolean);
}

// Names thermal/receipt printers commonly show up as in Windows — used to
// auto-select the RP326 (or another receipt printer) out of a printer list
// that also contains things like "Microsoft Print to PDF" or "OneNote".
const THERMAL_HINTS = /rp\s?326|pos[-\s]?(58|80)|thermal|receipt|80\s?mm|58\s?mm/i;

/** Best-guess receipt printer from a list of installed printer names. */
export function pickReceiptPrinter(list: string[]): string | undefined {
  return list.find((p) => THERMAL_HINTS.test(p));
}

export type PrinterStatus = {
  /** true = printer responded OK, false = confirmed offline/error, null = installed but status unknown */
  online: boolean | null;
  detail: string;
};

/**
 * Best-effort live status for one printer (e.g. after power-off, paper-out,
 * USB unplugged). Falls back gracefully — if QZ's status stream doesn't
 * respond in time, we still confirm whether the printer is at least
 * installed rather than reporting a false negative.
 */
export async function qzGetPrinterStatus(printerName: string, timeoutMs = 3000): Promise<PrinterStatus> {
  if (!printerName) return { online: null, detail: "No printer selected" };
  let qz: any;
  try {
    qz = await ensureConnected();
  } catch {
    return { online: null, detail: "QZ Tray unreachable" };
  }

  try {
    const list = await qzListPrinters();
    if (!list.includes(printerName)) {
      return { online: false, detail: "Not found on this PC" };
    }
  } catch {
    /* fall through to live status attempt */
  }

  return new Promise<PrinterStatus>((resolve) => {
    let settled = false;
    const finish = (result: PrinterStatus) => {
      if (settled) return;
      settled = true;
      try { qz.printers.stopListening(); } catch { /* ignore */ }
      resolve(result);
    };
    try {
      qz.printers.setPrinterCallbacks((evt: any) => {
        const name = evt?.printer || evt?.printerName;
        if (name && name !== printerName) return;
        const text = String(evt?.statusText || evt?.status || "").toLowerCase();
        const isBad = /offline|error|not.?avail|paper.?out|door.?open|disconnect|no.?paper/.test(text);
        const isOk = /ok|ready|idle|normal|online/.test(text);
        finish({
          online: isBad ? false : isOk ? true : null,
          detail: String(evt?.statusText || evt?.status || "Unknown"),
        });
      });
      qz.printers
        .startListening([printerName])
        .then(() => qz.printers.getStatus())
        .catch(() => finish({ online: true, detail: "Installed (live status unavailable)" }));
    } catch {
      finish({ online: true, detail: "Installed (live status unavailable)" });
    }
    setTimeout(() => finish({ online: true, detail: "Installed (no status response)" }), timeoutMs);
  });
}

async function sendRaw(printerName: string, receipt: string, kickDrawer: boolean) {
  const qz = await ensureConnected();
  const printer = printerName || (await qz.printers.getDefault());
  const config = qz.configs.create(printer);
  await qz.print(config, [receipt]);
  // Cash-drawer pulse is sent as a separate best-effort job so a drawer
  // issue can never stop the receipt from printing.
  if (kickDrawer) {
    try {
      await qz.print(config, [{ type: "raw", format: "command", flavor: "hex", data: "1B700019FA" }]);
    } catch {
      /* ignore drawer errors */
    }
  }
}

// ── ESC/POS command builders ─────────────────────────────────────
const ESC = "\x1B";
const GS = "\x1D";
const INIT = ESC + "@";
const BOLD_ON = ESC + "E" + "\x01";
const BOLD_OFF = ESC + "E" + "\x00";
const AL_L = ESC + "a" + "\x00";
const AL_C = ESC + "a" + "\x01";
const SIZE_1 = GS + "!" + "\x00"; // normal
const SIZE_2 = GS + "!" + "\x11"; // double width + height
const CUT = "\n\n\n" + GS + "V" + "\x00"; // feed + full cut

const WIDTH = 48; // Font A, 80mm

function rule(ch = "-") {
  return ch.repeat(WIDTH) + "\n";
}
function clip(s: string, w: number) {
  return s.length > w ? s.slice(0, w) : s;
}
function padR(s: string, w: number) {
  s = clip(s, w);
  return s + " ".repeat(w - s.length);
}
function padL(s: string, w: number) {
  s = clip(s, w);
  return " ".repeat(w - s.length) + s;
}
function two(l: string, r: string) {
  const gap = Math.max(1, WIDTH - l.length - r.length);
  return l + " ".repeat(gap) + r + "\n";
}

// Item columns: Name(22) Price(9,R) Qty(4,R) Value(13,R) = 48
function itemRow(name: string, price: string, qty: string, value: string) {
  return padR(name, 22) + padL(price, 9) + padL(qty, 4) + padL(value, 13) + "\n";
}

// ── Logo raster (ESC/POS "GS v 0" raster bit image) ────────────────
// The raw ESC/POS text path (QZ Tray + the native USB plugin) has no
// concept of an <img> tag — unlike the browser/HTML print path in
// print.ts — so without this, the logo simply never printed at all.
// This loads the PNG via Canvas, thresholds it to 1-bit monochrome, and
// packs it into the raster image command the printer expects.
//
// Cached by URL: re-downloading the PNG and redoing the Canvas pixel loop
// on every single print (as the first version did) added several seconds
// per bill. The rasterized bytes never change between prints, so this
// computes them once per session and reuses the cached result after that.
const logoRasterCache = new Map<string, Promise<string>>();

async function imageToEscPosRaster(url: string, dotsWidth = 384): Promise<string> {
  const cached = logoRasterCache.get(url);
  if (cached) return cached;
  const promise = rasterizeImage(url, dotsWidth);
  logoRasterCache.set(url, promise);
  promise.catch(() => logoRasterCache.delete(url)); // don't cache failures
  return promise;
}

async function rasterizeImage(url: string, dotsWidth: number): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Logo image failed to load: " + url));
    img.src = url;
  });

  const scale = dotsWidth / img.naturalWidth;
  const dotsHeight = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dotsWidth;
  canvas.height = dotsHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // Paint white first — the logo PNG has transparent/near-white areas that
  // should stay unprinted, not turn into stray black dots.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, dotsWidth, dotsHeight);
  ctx.drawImage(img, 0, 0, dotsWidth, dotsHeight);

  const { data } = ctx.getImageData(0, 0, dotsWidth, dotsHeight);
  const bytesPerRow = Math.ceil(dotsWidth / 8);
  const bitmap = new Uint8Array(bytesPerRow * dotsHeight);

  for (let y = 0; y < dotsHeight; y++) {
    for (let x = 0; x < dotsWidth; x++) {
      const i = (y * dotsWidth + x) * 4;
      const alpha = data[i + 3] / 255;
      // Composite against white, then luminance-threshold to black/white —
      // same idea as the grayscale+contrast filter used for the HTML path.
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) * alpha + 255 * (1 - alpha);
      if (lum < 128) {
        bitmap[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = dotsHeight & 0xff;
  const yH = (dotsHeight >> 8) & 0xff;

  let out = GS + "v" + "0" + String.fromCharCode(0, xL, xH, yL, yH);
  for (let i = 0; i < bitmap.length; i++) out += String.fromCharCode(bitmap[i]);
  return out;
}

export async function buildBillEscPos(d: BillData): Promise<string> {
  const date = (d.date || new Date())
    .toLocaleString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    })
    .replace(",", "");
  const grand = Math.round(d.total);
  const rupee = (n: number) => String(Math.round(n));

  let o = INIT + BOLD_ON;
  if (d.logoUrl) {
    try {
      o += AL_C + (await imageToEscPosRaster(absUrl(d.logoUrl))) + "\n";
    } catch (e) {
      console.error("Logo raster print failed — continuing without it", e);
    }
  }
  // SIZE_2 doubles character width, so only WIDTH/2 columns actually fit per
  // line — the old hardcoded 20 truncated names that would've fit fine.
  o += AL_C + SIZE_2 + clip(d.storeName, Math.floor(WIDTH / 2)) + "\n" + SIZE_1;
  if (d.phone) o += "Ph: " + d.phone + "\n";
  if (d.address) o += clip(d.address, WIDTH) + "\n";
  if (d.gstNumber) o += "GSTIN: " + d.gstNumber + "\n";
  o += AL_L + rule("=");
  o += date + "\n";
  o += "Bill No: " + d.invoiceNumber + "\n";
  if (d.customerName) o += "Customer: " + d.customerName + "\n";
  o += rule("=");
  o += itemRow("Item", "Price", "Qty", "Value");
  o += rule();
  d.items.forEach((it) => {
    o += itemRow(it.name, rupee(it.price), String(it.qty), rupee(it.price * it.qty));
  });
  o += rule("=");
  o += two("Sub Total:", rupee(d.subtotal));
  if (d.discountAmount && d.discountAmount > 0) o += two("Discount:", "-" + rupee(d.discountAmount));
  if (d.gstAmount && d.gstAmount > 0) o += two("GST:", "+" + rupee(d.gstAmount));
  o += two("GRAND TOTAL:", String(grand));
  o += rule();
  o += "Payment: " + (d.paymentMethod || "Cash") + "\n";
  o += AL_C + "\nThank You! Visit Again!!\n";
  o += CUT;
  return o;
}

export function buildKotEscPos(d: KotHtmlData): string {
  const time = new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  let o = INIT + BOLD_ON + AL_C;
  o += SIZE_2 + "KOT\n" + SIZE_1;
  o += "Kitchen Order Ticket\n";
  o += rule();
  if (d.orderMode) o += d.orderMode.replace(/_/g, " ") + "\n";
  o += "Bill: " + d.invoiceNumber + "\n";
  if (d.tableName) o += "Table: " + d.tableName + "\n";
  if (d.customerName) o += "Customer: " + d.customerName + "\n";
  o += time + "\n";
  o += AL_L + rule("=");
  o += padR("Qty", 6) + "Item\n";
  o += rule();
  d.items.forEach((i) => {
    o += padR(i.qty + "x", 6) + clip(i.name.toUpperCase(), WIDTH - 6) + "\n";
  });
  o += rule("=");
  o += AL_C + "*** END KOT ***\n";
  o += CUT;
  return o;
}

// ── RawBT (Android USB/Bluetooth/Wi-Fi ESC/POS printing) ──────────
// RawBT (Play Store: ru.a402d.rawbtprinter) owns the actual connection to
// the printer on Android — this just hands it raw ESC/POS bytes via its
// "rawbt:" intent scheme. Fire-and-forget: Android gives no callback if the
// app isn't installed, so unlike QZ there's no live connection check.
const LS_RAWBT_ENABLED = "rawbt_enabled";

export function getRawBtEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_RAWBT_ENABLED) === "1";
}

export function setRawBtEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_RAWBT_ENABLED, enabled ? "1" : "0");
}

function sendRawBt(escpos: string) {
  let b64: string;
  try {
    b64 = btoa(escpos);
  } catch {
    // escpos has chars outside Latin1 (e.g. non-ASCII item names) — btoa()
    // rejects those directly, so fall back to a UTF-8-safe encoding.
    b64 = btoa(unescape(encodeURIComponent(escpos)));
  }
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = "rawbt:base64," + b64;
  document.body.appendChild(iframe);
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* already gone */ }
  }, 1000);
}

/** Fire a small ESC/POS test slip via RawBT (settings screen). */
export function rawbtTestPrint() {
  const receipt =
    INIT + AL_C + BOLD_ON + SIZE_2 + "TEST OK\n" + SIZE_1 + BOLD_OFF +
    "RawBT + ESC/POS\n" + new Date().toLocaleString("en-IN") + "\n" +
    rule() + "If you can read this, printing works.\n" + CUT;
  sendRawBt(receipt);
}

// ── Smart print entry points ──────────────────────────────────────
// Priority: native USB plugin (our own Android app shell) → QZ Tray
// (Windows/Mac/Linux desktop) → RawBT (Android browser tab) → plain browser.
export async function printBill(d: BillData): Promise<void> {
  if (isNativeApp()) {
    try {
      await printUsbRaw(await buildBillEscPos(d));
      return;
    } catch (e) {
      console.error("Native USB bill print failed — falling back", e);
      toast.error("USB printer unreachable — check Settings");
    }
  }
  const cfg = getQzConfig();
  if (cfg.enabled) {
    try {
      const cash = (d.paymentMethod || "Cash").toLowerCase() === "cash";
      await sendRaw(cfg.printer, await buildBillEscPos(d), cfg.kickDrawer && cash);
      return;
    } catch (e) {
      console.error("QZ bill print failed — falling back to browser print", e);
      toast.error("Printer (QZ Tray) unreachable — printed via browser instead");
    }
  }
  if (getRawBtEnabled()) {
    sendRawBt(await buildBillEscPos(d));
    return;
  }
  return printReceipt(buildBillHtml(d));
}

export async function printKot(d: KotHtmlData): Promise<void> {
  if (isNativeApp()) {
    try {
      await printUsbRaw(buildKotEscPos(d));
      return;
    } catch (e) {
      console.error("Native USB KOT print failed — falling back", e);
    }
  }
  const cfg = getQzConfig();
  if (cfg.enabled) {
    try {
      await sendRaw(cfg.printer, buildKotEscPos(d), false);
      return;
    } catch (e) {
      console.error("QZ KOT print failed — falling back to browser print", e);
    }
  }
  if (getRawBtEnabled()) {
    sendRawBt(buildKotEscPos(d));
    return;
  }
  return printReceipt(buildKotHtml(d));
}

/** Fire a small ESC/POS test slip (settings screen). Throws on failure. */
export async function qzTestPrint(printerName: string, kickDrawer: boolean) {
  const receipt =
    INIT +
    AL_C +
    BOLD_ON +
    SIZE_2 +
    "TEST OK\n" +
    SIZE_1 +
    BOLD_OFF +
    "QZ Tray + ESC/POS\n" +
    new Date().toLocaleString("en-IN") +
    "\n" +
    rule() +
    "If you can read this, printing works.\n" +
    CUT;
  await sendRaw(printerName, receipt, kickDrawer);
}
