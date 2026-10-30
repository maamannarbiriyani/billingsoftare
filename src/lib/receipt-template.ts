// Receipt template ("Bill Design") — what a branch's printed bill shows.
// Shared by server (load/save) and client (render/preview), so no
// "use client" and no browser APIs here.
//
// The bill keeps a fixed section order (header → bill info → items →
// totals → payment → footer); a template only toggles, renames and styles
// things inside those sections, so a customer can't produce a broken bill.

export type ReceiptLine = { text: string; bold: boolean };

export type ReceiptConfig = {
  v: 1;
  // Header
  logo: "default" | "custom" | "none";
  logoSize: "small" | "medium" | "large";
  /** "" = use the branch's store settings */
  storeName: string;
  storeNameBold: boolean;
  address: string;
  phone: string;
  gstin: string;
  showAddress: boolean;
  showPhone: boolean;
  showGstin: boolean;
  headerLines: ReceiptLine[];
  // Bill info
  showDate: boolean;
  showBillNo: boolean;
  billNoBig: boolean;
  showRef: boolean;
  showCustomer: boolean;
  showCashier: boolean;
  showTable: boolean;
  // Items
  extraColumn: "none" | "sno" | "hsn";
  labels: { item: string; price: string; qty: string; value: string };
  // Totals & payment
  showSubtotal: boolean;
  showDiscount: boolean;
  showGst: boolean;
  splitGst: boolean;
  showRoundOff: boolean;
  grandBold: boolean;
  showTender: boolean;
  showPaymentMode: boolean;
  showOrderType: boolean;
  // Look
  divider: "classic" | "dash" | "double" | "dot" | "blank";
  footerLines: ReceiptLine[];
};

export const MAX_EXTRA_LINES = 3;
/** Uploaded logos are resized in the browser; this caps the stored data URL. */
export const MAX_LOGO_BYTES = 400_000;

/** Template 1 — the bill exactly as it printed before templates existed. */
export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  v: 1,
  logo: "default",
  logoSize: "large",
  storeName: "",
  storeNameBold: true,
  address: "",
  phone: "",
  gstin: "",
  showAddress: true,
  showPhone: true,
  showGstin: true,
  headerLines: [],
  showDate: true,
  showBillNo: true,
  billNoBig: true,
  showRef: true,
  showCustomer: true,
  showCashier: false,
  showTable: false,
  extraColumn: "none",
  labels: { item: "Item", price: "Price", qty: "Qty", value: "Value" },
  showSubtotal: true,
  showDiscount: true,
  showGst: true,
  splitGst: false,
  showRoundOff: false,
  grandBold: true,
  showTender: false,
  showPaymentMode: true,
  showOrderType: true,
  divider: "classic",
  footerLines: [{ text: "Thank You! Visit Again!!", bold: false }],
};

/** A template as sent to the client for printing. */
export type ReceiptTemplateData = { config: ReceiptConfig; logo: string | null };

const pick = <T,>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const str = (v: unknown, fallback: string, max = 120) =>
  typeof v === "string" ? v.slice(0, max) : fallback;
const lines = (v: unknown, fallback: ReceiptLine[]): ReceiptLine[] =>
  Array.isArray(v)
    ? v
        .filter((l) => l && typeof l.text === "string")
        .slice(0, MAX_EXTRA_LINES)
        .map((l) => ({ text: String(l.text).slice(0, 60), bold: !!l.bold }))
    : fallback;

/**
 * Turns anything (stored JSON string, partial object, garbage) into a
 * complete, valid config. Unknown/missing fields fall back to Template 1,
 * so a bad template can never stop a bill from printing.
 */
export function normalizeReceiptConfig(input: unknown): ReceiptConfig {
  let raw: Record<string, unknown> = {};
  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    if (parsed && typeof parsed === "object") raw = parsed as Record<string, unknown>;
  } catch {
    /* fall back to defaults */
  }
  const d = DEFAULT_RECEIPT_CONFIG;
  const labels = (raw.labels && typeof raw.labels === "object" ? raw.labels : {}) as Record<string, unknown>;
  return {
    v: 1,
    logo: pick(raw.logo, ["default", "custom", "none"] as const, d.logo),
    logoSize: pick(raw.logoSize, ["small", "medium", "large"] as const, d.logoSize),
    storeName: str(raw.storeName, d.storeName, 60),
    storeNameBold: bool(raw.storeNameBold, d.storeNameBold),
    address: str(raw.address, d.address, 160),
    phone: str(raw.phone, d.phone, 60),
    gstin: str(raw.gstin, d.gstin, 30),
    showAddress: bool(raw.showAddress, d.showAddress),
    showPhone: bool(raw.showPhone, d.showPhone),
    showGstin: bool(raw.showGstin, d.showGstin),
    headerLines: lines(raw.headerLines, d.headerLines),
    showDate: bool(raw.showDate, d.showDate),
    showBillNo: bool(raw.showBillNo, d.showBillNo),
    billNoBig: bool(raw.billNoBig, d.billNoBig),
    showRef: bool(raw.showRef, d.showRef),
    showCustomer: bool(raw.showCustomer, d.showCustomer),
    showCashier: bool(raw.showCashier, d.showCashier),
    showTable: bool(raw.showTable, d.showTable),
    extraColumn: pick(raw.extraColumn, ["none", "sno", "hsn"] as const, d.extraColumn),
    labels: {
      item: str(labels.item, d.labels.item, 12) || d.labels.item,
      price: str(labels.price, d.labels.price, 8) || d.labels.price,
      qty: str(labels.qty, d.labels.qty, 4) || d.labels.qty,
      value: str(labels.value, d.labels.value, 10) || d.labels.value,
    },
    showSubtotal: bool(raw.showSubtotal, d.showSubtotal),
    showDiscount: bool(raw.showDiscount, d.showDiscount),
    showGst: bool(raw.showGst, d.showGst),
    splitGst: bool(raw.splitGst, d.splitGst),
    showRoundOff: bool(raw.showRoundOff, d.showRoundOff),
    grandBold: bool(raw.grandBold, d.grandBold),
    showTender: bool(raw.showTender, d.showTender),
    showPaymentMode: bool(raw.showPaymentMode, d.showPaymentMode),
    showOrderType: bool(raw.showOrderType, d.showOrderType),
    divider: pick(raw.divider, ["classic", "dash", "double", "dot", "blank"] as const, d.divider),
    footerLines: lines(raw.footerLines, d.footerLines),
  };
}

/** Character used for the major / minor dividers of a style. */
export function dividerChars(style: ReceiptConfig["divider"]): { major: string; minor: string } {
  switch (style) {
    case "dash":
      return { major: "-", minor: "-" };
    case "double":
      return { major: "=", minor: "=" };
    case "dot":
      return { major: ".", minor: "." };
    case "blank":
      return { major: " ", minor: " " };
    default:
      return { major: "=", minor: "-" };
  }
}

/** Logo raster width in printer dots (80mm head = 576 dots). */
export const LOGO_DOTS: Record<ReceiptConfig["logoSize"], number> = { small: 256, medium: 320, large: 384 };
/** Logo max width on the HTML/browser receipt. */
export const LOGO_MM: Record<ReceiptConfig["logoSize"], number> = { small: 34, medium: 42, large: 50 };

/** CGST/SGST halves of a GST amount (SGST takes the rounding remainder). */
export function splitGstAmount(gst: number): { cgst: number; sgst: number } {
  const cgst = Math.round((gst / 2) * 100) / 100;
  return { cgst, sgst: Math.round((gst - cgst) * 100) / 100 };
}
