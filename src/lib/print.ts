"use client";

// ─────────────────────────────────────────────────────────────
// Thermal-printer friendly receipt printing.
//
// Prints via a hidden <iframe> (NOT window.open) so popup blockers
// never interfere. When the browser is launched in Chrome
// "kiosk printing" mode (--kiosk-printing), window.print() goes
// straight to the default printer with NO dialog and NO PDF prompt.
// Otherwise the normal print dialog appears.
// ─────────────────────────────────────────────────────────────

const RECEIPT_STYLES = `
  @page { margin: 0; size: 80mm auto; }
  .receipt-wrapper * { margin: 0; padding: 0; box-sizing: border-box; }
  .receipt-wrapper { background: #fff; width: 72mm; margin: 0 auto; color: #000; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-weight: bold; padding: 2mm 1.5mm; font-size: 13px; line-height: 1.35; }
  .receipt-wrapper .center { text-align: center; }
  .receipt-wrapper .right { text-align: right; }
  .receipt-wrapper .bold { font-weight: bold; }
  .receipt-wrapper .logo { display:block; margin: 2px auto 4px; max-width: 60mm; max-height: 22mm; object-fit: contain; filter: grayscale(1); }
  .receipt-wrapper .store { font-size: 18px; font-weight: 900; }
  .receipt-wrapper .muted { font-size: 12px; }
  .receipt-wrapper .hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  .receipt-wrapper .hr-solid { border: 0; border-top: 1px solid #000; margin: 4px 0; }
  .receipt-wrapper table { width: 100%; border-collapse: collapse; }
  .receipt-wrapper th { font-size: 11px; text-transform: uppercase; text-align: left; padding: 1px 0; font-weight: 900; }
  .receipt-wrapper td { font-size: 13px; padding: 2px 0; vertical-align: top; }
  .receipt-wrapper .totrow td { padding: 1px 0; }
  .receipt-wrapper .kot-h1 { font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
  .receipt-wrapper .kot-q { font-size: 16px; font-weight: 900; width: 34px; }
  .receipt-wrapper .kot-n { font-size: 15px; font-weight: bold; padding-left: 4px; }
  .receipt-wrapper .badge { display:inline-block; background:#000; color:#fff; padding:2px 8px; font-size:10px; font-weight:900; letter-spacing:2px; }
`;

function wrapReceipt(inner: string): string {
  // <base> ensures relative asset URLs (e.g. /billlogo.png) resolve correctly
  // inside the document.write'd iframe in every browser.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<base href="${origin}/">
<style>
  html { background: #fff; }
  body { margin: 0; }
  ${RECEIPT_STYLES}
</style></head><body><div class="receipt-wrapper">${inner}</div></body></html>`;
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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile browsers (esp Android Chrome) ignore iframe printing. 
      // Inject directly into the top-level DOM.
      const style = document.createElement("style");
      style.textContent = `
        @media print {
          body > *:not(#print-root-container) { display: none !important; }
          #print-root-container { display: block !important; }
        }
        @media screen {
          #print-root-container { display: none !important; }
        }
        ${RECEIPT_STYLES}
      `;
      document.head.appendChild(style);

      const div = document.createElement("div");
      div.id = "print-root-container";
      div.className = "receipt-wrapper";
      div.innerHTML = innerHtml;
      document.body.appendChild(div);

      const triggerPrint = () => {
        setTimeout(() => {
          window.print();
          // Cleanup after print dialog closes
          setTimeout(() => {
            try { document.head.removeChild(style); } catch {}
            try { document.body.removeChild(div); } catch {}
            resolve();
          }, 1000);
        }, 150);
      };

      const imgs = Array.from(div.querySelectorAll("img"));
      if (imgs.length === 0) {
        triggerPrint();
      } else {
        let remaining = imgs.length;
        const done = () => { if (--remaining <= 0) triggerPrint(); };
        imgs.forEach((img) => {
          if (img.complete) done();
          else { img.onload = done; img.onerror = done; }
        });
        setTimeout(triggerPrint, 1500); // safety fallback
      }
      return;
    }

    // --- Desktop: Use hidden iframe (prevents page from flashing or blocking UI) ---
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* already gone */ }
        resolve();
      }, 600);
    };

    const doc = iframe.contentWindow?.document;
    if (!doc) { cleanup(); return; }

    doc.open();
    doc.write(wrapReceipt(innerHtml));
    doc.close();

    let triggered = false;
    const triggerPrint = () => {
      if (triggered) return;
      triggered = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch { /* ignore */ }
      cleanup();
    };

    // Wait for any images (logo) to load before printing.
    const imgs = Array.from(doc.images || []);
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

  const rows = d.items.map((it) => `
    <tr>
      <td style="width:30mm" class="">${esc(it.name)}</td>
      <td style="width:13mm" class="right">${it.price.toFixed(2)}</td>
      <td style="width:7mm" class="center">${it.qty}</td>
      <td style="width:17mm" class="right">${(it.price * it.qty).toFixed(2)}</td>
    </tr>`).join("");

  return `
    ${d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="">` : ""}
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
        <th style="width:30mm">Item</th>
        <th style="width:13mm" class="right">Price</th>
        <th style="width:7mm" class="center">Qty</th>
        <th style="width:17mm" class="right">Value</th>
      </tr></thead>
    </table>
    <hr class="hr">
    <table><tbody>${rows}</tbody></table>
    <hr class="hr-solid">
    <table>
      <tr class="totrow"><td class="right">Sub Total:</td><td class="right" style="width:22mm">${d.subtotal.toFixed(2)}</td></tr>
      ${d.discountAmount && d.discountAmount > 0 ? `<tr class="totrow"><td class="right">Discount:</td><td class="right" style="width:22mm">-${d.discountAmount.toFixed(2)}</td></tr>` : ""}
      ${d.gstAmount && d.gstAmount > 0 ? `<tr class="totrow"><td class="right">GST:</td><td class="right" style="width:22mm">+${d.gstAmount.toFixed(2)}</td></tr>` : ""}
      <tr class="totrow"><td class="right bold">Grand Total:</td><td class="right bold" style="width:22mm">${grand.toFixed(2)}</td></tr>
    </table>
    <hr class="hr">
    <div>Tender: ${grand.toFixed(2)}</div>
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
    ${d.logoUrl ? `<img class="logo" src="${esc(d.logoUrl)}" alt="">` : ""}
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
