"use client";

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
      #${ROOT_ID} * { margin: 0; padding: 0; box-sizing: border-box; }
      #${ROOT_ID} .center { text-align: center; }
      #${ROOT_ID} .right { text-align: right; }
      #${ROOT_ID} .bold { font-weight: bold; }
      /* grayscale(1) converts the red logo to mid-gray; contrast() alone (no brightness())
         pushes that mid-gray toward black while leaving the white background at white —
         brightness() was removed because it darkens every pixel uniformly, including the
         white background, which printed as a visible gray box behind the logo. */
      #${ROOT_ID} .logo { display:block; margin: 2px auto 4px; max-width: 50mm; max-height: 22mm; object-fit: contain; filter: grayscale(1) contrast(4); }
      #${ROOT_ID} .store { font-size: var(--receipt-brand-fs, 18px); font-weight: 900; }
      #${ROOT_ID} .muted { font-size: 12px; }
      #${ROOT_ID} .hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
      #${ROOT_ID} .hr-solid { border: 0; border-top: 1px solid #000; margin: 4px 0; }
      #${ROOT_ID} table { width: 100%; border-collapse: collapse; }
      #${ROOT_ID} th { font-size: 11px; text-transform: uppercase; text-align: left; padding: 1px 0; font-weight: 900; }
      #${ROOT_ID} td { font-size: var(--receipt-body-fs, 13px); padding: 2px 0; vertical-align: top; }
      #${ROOT_ID} .totrow td { padding: 1px 0; }
      #${ROOT_ID} .grand-total { font-size: var(--receipt-grand-fs, 13px); }
      #${ROOT_ID} .kot-h1 { font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
      #${ROOT_ID} .kot-q { font-size: 16px; font-weight: 900; width: 34px; }
      #${ROOT_ID} .kot-n { font-size: 15px; font-weight: bold; padding-left: 4px; }
      #${ROOT_ID} .badge { display:inline-block; background:#000; color:#fff; padding:2px 8px; font-size:10px; font-weight:900; letter-spacing:2px; }
    `;
    document.head.appendChild(style);
  }
  return root;
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
  date?: Date;
  customerName?: string | null;
  paymentMethod?: string | null;
  items: Array<{ name: string; price: number; qty: number }>;
  subtotal: number;
  gstAmount?: number;
  discountAmount?: number;
  total: number;
};

export function buildBillHtml(d: BillData): string {
  const date = (d.date || new Date());
  const dateStr = date.toLocaleString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(",", "");

  const grand = Math.round(d.total);
  const rupee = (n: number) => String(Math.round(n));

  const rows = d.items.map((it) => `
    <tr>
      <td style="width:42%" class="">${esc(it.name)}</td>
      <td style="width:18%; padding-right:6px" class="right">${rupee(it.price)}</td>
      <td style="width:10%" class="center">${it.qty}</td>
      <td style="width:26%" class="right">${rupee(it.price * it.qty)}</td>
    </tr>`).join("");

  return `
    ${d.logoUrl ? `<img class="logo" src="${esc(absUrl(d.logoUrl))}" alt="">` : ""}
    <div class="center">
      <div class="store">${esc(d.storeName)}</div>
      ${d.phone ? `<div class="muted">Ph: ${esc(d.phone)}</div>` : ""}
      ${d.address ? `<div class="muted">${esc(d.address)}</div>` : ""}
      ${d.gstNumber ? `<div class="muted">GSTIN: ${esc(d.gstNumber)}</div>` : ""}
    </div>
    <hr class="hr-solid">
    <div>${dateStr}</div>
    <div>Bill No: ${esc(d.invoiceNumber)}</div>
    ${d.customerName ? `<div class="bold">Customer: ${esc(d.customerName)}</div>` : ""}
    <hr class="hr-solid">
    <table>
      <thead><tr>
        <th style="width:42%">Item</th>
        <th style="width:18%; padding-right:6px" class="right">Price</th>
        <th style="width:10%" class="center">Qty</th>
        <th style="width:26%" class="right">Value</th>
      </tr></thead>
    </table>
    <hr class="hr">
    <table><tbody>${rows}</tbody></table>
    <hr class="hr-solid">
    <table>
      <tr class="totrow"><td class="right">Sub Total:</td><td class="right" style="width:30%">${rupee(d.subtotal)}</td></tr>
      ${d.discountAmount && d.discountAmount > 0 ? `<tr class="totrow"><td class="right">Discount:</td><td class="right" style="width:30%">-${rupee(d.discountAmount)}</td></tr>` : ""}
      ${d.gstAmount && d.gstAmount > 0 ? `<tr class="totrow"><td class="right">GST:</td><td class="right" style="width:30%">+${rupee(d.gstAmount)}</td></tr>` : ""}
      <tr class="totrow"><td class="right bold grand-total">Grand Total:</td><td class="right bold grand-total" style="width:30%">${grand}</td></tr>
    </table>
    <hr class="hr">
    <div>Tender: ${grand}</div>
    <div>Payment Mode: ${esc(d.paymentMethod || "Cash")}</div>
    <hr class="hr-solid">
    <div class="center" style="padding:6px 0 10px">Thank You! Visit Again!!</div>
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
