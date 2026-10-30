"use client";

import {
  DEFAULT_RECEIPT_CONFIG,
  LOGO_MM,
  dividerChars,
  splitGstAmount,
  type ReceiptTemplateData,
} from "@/lib/receipt-template";

// ─────────────────────────────────────────────────────────────
// Thermal-printer friendly receipt printing.
//
// Prints by injecting the receipt into the current page (hidden), then
// calling window.print() on the TOP-LEVEL window with print-only CSS that
// hides everything else. This used to print from a hidden <iframe> instead,
// which works on desktop Chrome but is silently a no-op on Android Chrome —
// iframe.contentWindow.print() does not reliably invoke anything there.
// Printing the top-level window avoids that platform gap, and avoids
// popup blockers too (no new window/tab is ever opened).
//
// When the browser is launched in Chrome "kiosk printing" mode
// (--kiosk-printing), window.print() goes straight to the default printer
// with NO dialog and NO PDF prompt. Otherwise the normal print dialog (or,
// on Android, the OS print sheet) appears.
// ─────────────────────────────────────────────────────────────

const ROOT_ID = "__receipt_print_root";
const STYLE_ID = "__receipt_print_style";

// ── Receipt font weight (browser/HTML print path) ──────────────
// Configurable from Settings so each terminal can pick whichever weight
// actually looks best on its printer/paper — thermal print quality varies
// enough by printer/driver that one fixed weight doesn't suit everyone.
const LS_FONT_WEIGHT = "receipt_font_weight";
export const FONT_WEIGHT_OPTIONS = [
  { value: 400, label: "Normal" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semi-Bold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
] as const;
const DEFAULT_FONT_WEIGHT = 400;

export function getReceiptFontWeight(): number {
  if (typeof window === "undefined") return DEFAULT_FONT_WEIGHT;
  const v = Number(localStorage.getItem(LS_FONT_WEIGHT));
  return FONT_WEIGHT_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_FONT_WEIGHT;
}

export function setReceiptFontWeight(weight: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_FONT_WEIGHT, String(weight));
}

// ── Receipt element font sizes (browser/HTML print path) ────────
// Independent per-element controls, since "font size" means different
// things for the store name, the general body text, and the grand total —
// unlike font-weight above, these are pixel sizes, so the range is
// continuous rather than a couple of discrete ESC/POS steps.
type SizeOption = { value: number; label: string };

export const BRAND_FONT_SIZE_OPTIONS: SizeOption[] = [
  { value: 16, label: "Normal" },
  { value: 18, label: "Large" }, // matches the original hardcoded default
  { value: 22, label: "Extra Large" },
];
export const BODY_FONT_SIZE_OPTIONS: SizeOption[] = [
  { value: 12, label: "Small" },
  { value: 13, label: "Normal" }, // matches the original hardcoded default
  { value: 15, label: "Large" },
];
export const GRAND_FONT_SIZE_OPTIONS: SizeOption[] = [
  { value: 13, label: "Normal" }, // matches the original (no dedicated size existed — same as body)
  { value: 16, label: "Large" },
  { value: 20, label: "Extra Large" },
];

const LS_BRAND_FS = "receipt_brand_font_size";
const LS_BODY_FS = "receipt_body_font_size";
const LS_GRAND_FS = "receipt_grand_font_size";

function readPx(key: string, options: SizeOption[], fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = Number(localStorage.getItem(key));
  return options.some((o) => o.value === v) ? v : fallback;
}

export const getReceiptBrandFontSize = () => readPx(LS_BRAND_FS, BRAND_FONT_SIZE_OPTIONS, 18);
export const getReceiptBodyFontSize = () => readPx(LS_BODY_FS, BODY_FONT_SIZE_OPTIONS, 13);
export const getReceiptGrandFontSize = () => readPx(LS_GRAND_FS, GRAND_FONT_SIZE_OPTIONS, 13);

export function setReceiptBrandFontSize(px: number) {
  if (typeof window !== "undefined") localStorage.setItem(LS_BRAND_FS, String(px));
}
export function setReceiptBodyFontSize(px: number) {
  if (typeof window !== "undefined") localStorage.setItem(LS_BODY_FS, String(px));
}
export function setReceiptGrandFontSize(px: number) {
  if (typeof window !== "undefined") localStorage.setItem(LS_GRAND_FS, String(px));
}

function ensurePrintDom(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} { display: none; }
      @media print {
        /* html * (not just body *) so this also hides elements some browser
           extensions inject as direct siblings of <body> (outside it, under
           <html>) — those aren't reached by a body-only selector and can
           otherwise bleed stray marks into the printed page. */
        html * { visibility: hidden !important; }
        #${ROOT_ID}, #${ROOT_ID} * { visibility: visible !important; }
        #${ROOT_ID} {
          display: block !important;
          position: absolute; left: 0; top: 0;
          /* box-sizing: border-box is essential here — without it, this width is added
             ON TOP OF the padding below, which is wider than the printable area and
             clips the right edge no matter how the columns inside are sized. */
          box-sizing: border-box;
          /* Was 70mm, right up against this printer's driver-reported ~72mm printable
             width — with zero margin for error that "72mm" figure turned out to be
             optimistic: real thermal printer drivers commonly enforce their own
             hardware margins/offsets on top of what they report, and once the
             separate auto-height/scaling bug (which was accidentally masking this by
             shrinking everything to fit) got fixed, the Price/Qty/Value columns were
             landing off the physical page and not printing at all. 58mm leaves a much
             larger safety margin so the whole receipt reliably lands on the paper
             regardless of a given driver's real usable width. */
          width: 58mm; margin: 0 auto; background: #fff; color: #000;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          /* Normal by default — .bold/.store/th/etc opt into heavier weight for emphasis
             (totals, headers) regardless of this. Read from a CSS var (set fresh in
             printOne() below, from the Settings-configurable getReceiptFontWeight())
             rather than hardcoded, so a terminal can pick whichever weight looks best
             on its own printer/paper without waiting for a page reload. */
          font-weight: var(--receipt-fw, 400); font-size: var(--receipt-body-fs, 13px); line-height: 1.35;
          /* our monospace stack has visibly wider gaps between characters than the
             QPOS reference receipt's native printer font — tighten it to match. */
          letter-spacing: -0.4px;
          padding: 2mm;
        }
        @page { margin: 0; size: 80mm auto; }
      }
      ${receiptCss(`#${ROOT_ID}`)}
    `;
    document.head.appendChild(style);
  }
  return root;
}

/** Inner receipt styles, scoped — shared by printing and on-screen previews. */
export function receiptCss(s: string): string {
  return `
      ${s} * { margin: 0; padding: 0; box-sizing: border-box; }
      ${s} .center { text-align: center; }
      ${s} .right { text-align: right; }
      ${s} .bold { font-weight: bold; }
      /* grayscale(1) converts the red logo to mid-gray; contrast() alone (no brightness())
         pushes that mid-gray toward black while leaving the white background at white —
         brightness() was removed because it darkens every pixel uniformly, including the
         white background, which printed as a visible gray box behind the logo. */
      ${s} .logo { display:block; margin: 2px auto 4px; max-width: 50mm; max-height: 22mm; object-fit: contain; filter: grayscale(1) contrast(4); }
      ${s} .store { font-size: var(--receipt-brand-fs, 18px); font-weight: 900; }
      ${s} .muted { font-size: 12px; }
      ${s} .hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
      ${s} .hr-solid { border: 0; border-top: 1px solid #000; margin: 4px 0; }
      ${s} table { width: 100%; border-collapse: collapse; }
      ${s} th { font-size: 11px; text-transform: uppercase; text-align: left; padding: 1px 0; font-weight: 900; }
      ${s} td { font-size: var(--receipt-body-fs, 13px); padding: 2px 0; vertical-align: top; }
      ${s} .totrow td { padding: 1px 0; }
      ${s} .grand-total { font-size: var(--receipt-grand-fs, 13px); }
      ${s} .kot-h1 { font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
      ${s} .kot-q { font-size: 16px; font-weight: 900; width: 34px; }
      ${s} .kot-n { font-size: 15px; font-weight: bold; padding-left: 4px; }
      ${s} .badge { display:inline-block; background:#000; color:#fff; padding:2px 8px; font-size:10px; font-weight:900; letter-spacing:2px; }
  `;
}

let printing: Promise<void> = Promise.resolve();

/** Print one receipt's inner HTML. Calls are queued so multiple
 *  receipts (e.g. KOT + bill) print one after another, never overlapping. */
export function printReceipt(innerHtml: string): Promise<void> {
  printing = printing.then(() => printOne(innerHtml));
  return printing;
}

function printOne(innerHtml: string): Promise<void> {
  return new Promise((resolve) => {
    const root = ensurePrintDom();
    root.style.setProperty("--receipt-fw", String(getReceiptFontWeight()));
    root.style.setProperty("--receipt-brand-fs", getReceiptBrandFontSize() + "px");
    root.style.setProperty("--receipt-body-fs", getReceiptBodyFontSize() + "px");
    root.style.setProperty("--receipt-grand-fs", getReceiptGrandFontSize() + "px");
    root.innerHTML = innerHtml;

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("afterprint", cleanup);
      setTimeout(() => {
        root.innerHTML = "";
        resolve();
      }, 300);
    };

    let triggered = false;
    const triggerPrint = () => {
      if (triggered) return;
      triggered = true;
      window.addEventListener("afterprint", cleanup, { once: true });
      try {
        window.print();
      } catch { /* ignore */ }
      // afterprint isn't fired reliably on every Android/WebView build —
      // this safety timeout guarantees the queue always moves on.
      setTimeout(cleanup, 2000);
    };

    // Wait for any images (logo) to load before printing.
    const imgs = Array.from(root.querySelectorAll("img"));
    if (imgs.length === 0) {
      setTimeout(triggerPrint, 150);
    } else {
      let remaining = imgs.length;
      const done = () => { if (--remaining <= 0) triggerPrint(); };
      imgs.forEach((img) => {
        if (img.complete) done();
        else { img.onload = done; img.onerror = done; }
      });
      // Safety: print anyway if images stall.
      setTimeout(triggerPrint, 1500);
    }
  });
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// Some Android print pipelines rasterize the page through a context where a
// root-relative path like "/billlogo.png" doesn't resolve, silently failing
// to load and printing a broken-image glyph instead. Resolving to an
// absolute URL up front avoids that ambiguity everywhere.
export const absUrl = (url: string) =>
  typeof window !== "undefined" ? new URL(url, window.location.origin).href : url;

// ── Customer bill (80mm) ──────────────────────────────────────
export type BillData = {
  storeName: string;
  phone?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  logoUrl?: string;
  invoiceNumber: string;
  /** Per-branch bill number that restarts at 1 each day (null on old bills) */
  dailyNo?: number | null;
  /** DINE_IN / TAKEAWAY / SWIGGY / ZOMATO */
  orderMode?: string | null;
  date?: Date;
  customerName?: string | null;
  cashierName?: string | null;
  tableName?: string | null;
  paymentMethod?: string | null;
  items: Array<{ name: string; price: number; qty: number; hsn?: string | null }>;
  subtotal: number;
  gstAmount?: number;
  discountAmount?: number;
  total: number;
  /** Branch's Bill Design template; omitted = Template 1 (classic layout) */
  template?: ReceiptTemplateData | null;
};

/**
 * Everything both renderers (HTML here, ESC/POS in qz-print.ts) need,
 * resolved once from the bill + its template so they can't drift apart.
 */
export function resolveBill(d: BillData) {
  const t = d.template?.config ?? DEFAULT_RECEIPT_CONFIG;
  const logoSrc =
    t.logo === "none" ? null : t.logo === "custom" ? d.template?.logo || d.logoUrl || null : d.logoUrl || null;
  const total = d.total;
  const grand = Math.round(total);
  return {
    t,
    logoSrc,
    storeName: t.storeName || d.storeName,
    phone: t.showPhone ? t.phone || d.phone || "" : "",
    address: t.showAddress ? t.address || d.address || "" : "",
    gstin: t.showGstin ? t.gstin || d.gstNumber || "" : "",
    dateStr: (d.date || new Date())
      .toLocaleString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
      })
      .replace(",", ""),
    grand,
    roundOff: Math.round((grand - total) * 100) / 100,
    orderType: d.orderMode ? d.orderMode.replace(/_/g, " ") : "",
    divider: dividerChars(t.divider),
  };
}

const rupee = (n: number) => String(Math.round(n));
const money2 = (n: number) => n.toFixed(2);

const HR_CSS: Record<string, string> = {
  "=": "1px solid #000",
  "-": "1px dashed #000",
  ".": "1px dotted #000",
  " ": "0",
};

export function buildBillHtml(d: BillData): string {
  const r = resolveBill(d);
  const { t } = r;
  const hr = (ch: string) =>
    ch === " "
      ? `<div style="height:8px"></div>`
      : `<hr style="border:0;border-top:${t.divider === "double" ? "3px double #000" : HR_CSS[ch]};margin:4px 0">`;
  const major = hr(r.divider.major);
  const minor = hr(r.divider.minor);
  const lineHtml = (l: { text: string; bold: boolean }, cls = "") =>
    l.text.trim() ? `<div class="${cls}${l.bold ? " bold" : ""}">${esc(l.text)}</div>` : "";

  // Item columns: % widths; the optional extra column takes room from Item
  const extra = t.extraColumn;
  const w = extra === "sno" ? [7, 35] : extra === "hsn" ? [16, 26] : [0, 42];
  const extraHead = extra === "sno" ? "#" : extra === "hsn" ? "HSN" : "";
  const extraCell = (i: number, hsn?: string | null) =>
    extra === "sno" ? String(i + 1) : extra === "hsn" ? esc(hsn || "") : "";

  const rows = d.items
    .map(
      (it, i) => `
    <tr>
      ${extra !== "none" ? `<td style="width:${w[0]}%">${extraCell(i, it.hsn)}</td>` : ""}
      <td style="width:${w[1]}%">${esc(it.name)}</td>
      <td style="width:18%; padding-right:6px" class="right">${rupee(it.price)}</td>
      <td style="width:10%" class="center">${it.qty}</td>
      <td style="width:26%" class="right">${rupee(it.price * it.qty)}</td>
    </tr>`,
    )
    .join("");

  const totRow = (label: string, value: string, cls = "") =>
    `<tr class="totrow"><td class="right ${cls}">${label}</td><td class="right ${cls}" style="width:30%">${value}</td></tr>`;
  const gst = d.gstAmount || 0;
  const split = splitGstAmount(gst);
  const grandCls = `grand-total${t.grandBold ? " bold" : ""}`;

  const billNoCell =
    t.showBillNo && d.dailyNo
      ? `<td class="right bold"${t.billNoBig ? ` style="font-size:1.6em"` : ""}>Bill No: ${d.dailyNo}</td>`
      : "";
  // Old bills (no daily number) show the INV number as their Bill No
  const refLine = d.dailyNo
    ? t.showRef ? `<div>Ref: ${esc(d.invoiceNumber)}</div>` : ""
    : t.showBillNo || t.showRef ? `<div>Bill No: ${esc(d.invoiceNumber)}</div>` : "";
  const staffLeft = t.showCashier && d.cashierName ? `Cashier: ${esc(d.cashierName)}` : "";
  const staffRight = t.showTable && d.tableName ? `Table: ${esc(d.tableName)}` : "";
  const payLeft = t.showPaymentMode ? `Payment Mode: ${esc(d.paymentMethod || "Cash")}` : "";
  const payRight = t.showOrderType ? esc(r.orderType) : "";

  return `
    ${r.logoSrc ? `<img class="logo" style="max-width:${LOGO_MM[t.logoSize]}mm" src="${esc(absUrl(r.logoSrc))}" alt="">` : ""}
    <div class="center">
      <div class="store"${t.storeNameBold ? "" : ` style="font-weight:normal"`}>${esc(r.storeName)}</div>
      ${r.phone ? `<div class="muted">Ph: ${esc(r.phone)}</div>` : ""}
      ${r.address ? `<div class="muted">${esc(r.address)}</div>` : ""}
      ${r.gstin ? `<div class="muted">GSTIN: ${esc(r.gstin)}</div>` : ""}
      ${t.headerLines.map((l) => lineHtml(l, "muted")).join("")}
    </div>
    ${major}
    ${t.showDate || billNoCell ? `<table><tr><td>${t.showDate ? r.dateStr : ""}</td>${billNoCell}</tr></table>` : ""}
    ${refLine}
    ${staffLeft || staffRight ? `<table><tr><td>${staffLeft}</td><td class="right">${staffRight}</td></tr></table>` : ""}
    ${t.showCustomer && d.customerName ? `<div class="bold">Customer: ${esc(d.customerName)}</div>` : ""}
    ${major}
    <table>
      <thead><tr>
        ${extra !== "none" ? `<th style="width:${w[0]}%">${extraHead}</th>` : ""}
        <th style="width:${w[1]}%">${esc(t.labels.item)}</th>
        <th style="width:18%; padding-right:6px" class="right">${esc(t.labels.price)}</th>
        <th style="width:10%" class="center">${esc(t.labels.qty)}</th>
        <th style="width:26%" class="right">${esc(t.labels.value)}</th>
      </tr></thead>
    </table>
    ${minor}
    <table><tbody>${rows}</tbody></table>
    ${major}
    <table>
      ${t.showSubtotal ? totRow("Sub Total:", rupee(d.subtotal)) : ""}
      ${t.showDiscount && d.discountAmount && d.discountAmount > 0 ? totRow("Discount:", "-" + rupee(d.discountAmount)) : ""}
      ${t.showGst && gst > 0
        ? t.splitGst
          ? totRow("CGST:", "+" + money2(split.cgst)) + totRow("SGST:", "+" + money2(split.sgst))
          : totRow("GST:", "+" + rupee(gst))
        : ""}
      ${t.showRoundOff && r.roundOff !== 0 ? totRow("Round Off:", (r.roundOff > 0 ? "+" : "") + money2(r.roundOff)) : ""}
      ${totRow("Grand Total:", String(r.grand), grandCls)}
    </table>
    ${minor}
    ${t.showTender ? `<div>Tender: ${r.grand}</div>` : ""}
    ${payLeft || payRight ? `<table><tr><td>${payLeft}</td><td class="right">${payRight}</td></tr></table>` : ""}
    ${major}
    <div class="center" style="padding:6px 0 10px">${t.footerLines.map((l) => lineHtml(l)).join("")}</div>
  `;
}

// ── Kitchen Order Ticket (80mm) ───────────────────────────────
export type KotHtmlData = {
  invoiceNumber: string;
  orderMode?: string;
  tableName?: string | null;
  customerName?: string | null;
  items: Array<{ name: string; qty: number }>;
  storeName?: string;
  logoUrl?: string;
};

export function buildKotHtml(d: KotHtmlData): string {
  const rows = d.items.map((i) =>
    `<tr><td class="kot-q">${i.qty}×</td><td class="kot-n">${esc(i.name).toUpperCase()}</td></tr>`).join("");
  const time = new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  return `
    ${d.logoUrl ? `<img class="logo" src="${esc(absUrl(d.logoUrl))}" alt="">` : ""}
    ${d.storeName ? `<div class="center store" style="margin-bottom: 4px;">${esc(d.storeName)}</div>` : ""}
    <div class="center kot-h1">KOT</div>
    <div class="center muted">Kitchen Order Ticket</div>
    <hr class="hr">
    <div class="center">
      ${d.orderMode ? `<div class="badge">${esc(d.orderMode.replace(/_/g, " "))}</div><br>` : ""}
      <strong>${esc(d.invoiceNumber)}</strong><br>
      ${d.tableName ? `Table: <strong>${esc(d.tableName)}</strong><br>` : ""}
      ${d.customerName ? `Customer: <strong>${esc(d.customerName)}</strong><br>` : ""}
      ${time}
    </div>
    <hr class="hr-solid">
    <table>
      <thead><tr><th>Qty</th><th>Item</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <hr class="hr-solid">
    <div class="center muted" style="padding:6px 0">*** END KOT ***</div>
  `;
}
