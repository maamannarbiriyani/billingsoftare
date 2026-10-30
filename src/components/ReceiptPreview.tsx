"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  buildBillHtml,
  receiptCss,
  getReceiptFontWeight,
  getReceiptBrandFontSize,
  getReceiptBodyFontSize,
  getReceiptGrandFontSize,
  type BillData,
} from "@/lib/print";

const SCOPE = "receipt-preview";
const noopSubscribe = () => () => {};

/**
 * On-screen 80mm receipt rendered with the same HTML + CSS as the browser
 * print path, so the preview matches the printed bill. Built after mount:
 * the receipt uses the browser's origin and this terminal's font settings.
 */
export function ReceiptPreview({ bill, className = "" }: { bill: BillData; className?: string }) {
  // false during server render / hydration, true in the browser after that
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const html = useMemo(() => (mounted ? buildBillHtml(bill) : ""), [mounted, bill]);
  const vars = useMemo(
    () =>
      mounted
        ? {
            "--receipt-fw": String(getReceiptFontWeight()),
            "--receipt-brand-fs": getReceiptBrandFontSize() + "px",
            "--receipt-body-fs": getReceiptBodyFontSize() + "px",
            "--receipt-grand-fs": getReceiptGrandFontSize() + "px",
          }
        : {},
    [mounted],
  );

  return (
    <>
      <style>{`
        .${SCOPE} {
          width: 72mm; max-width: 100%; margin: 0 auto; padding: 3mm;
          background: #fff; color: #000;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-weight: var(--receipt-fw, 400); font-size: var(--receipt-body-fs, 13px);
          line-height: 1.35; letter-spacing: -0.4px;
        }
        ${receiptCss("." + SCOPE)}
      `}</style>
      <div
        className={`${SCOPE} ${className}`}
        style={vars as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
