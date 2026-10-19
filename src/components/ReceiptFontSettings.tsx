"use client";

import { useEffect, useState } from "react";
import { Type, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getReceiptFontWeight,
  setReceiptFontWeight,
  FONT_WEIGHT_OPTIONS,
  getReceiptBrandFontSize,
  setReceiptBrandFontSize,
  BRAND_FONT_SIZE_OPTIONS,
  getReceiptBodyFontSize,
  setReceiptBodyFontSize,
  BODY_FONT_SIZE_OPTIONS,
  getReceiptGrandFontSize,
  setReceiptGrandFontSize,
  GRAND_FONT_SIZE_OPTIONS,
  printReceipt,
  buildBillHtml,
} from "@/lib/print";
import {
  getEscposBoldness,
  setEscposBoldness,
  ESCPOS_BOLDNESS_OPTIONS,
  type EscposBoldness,
  getBrandSizeLevel,
  setBrandSizeLevel,
  getBodySizeLevel,
  setBodySizeLevel,
  getGrandSizeLevel,
  setGrandSizeLevel,
  SIZE_LEVEL_OPTIONS,
  type SizeLevel,
  printBill,
} from "@/lib/qz-print";

const TEST_BILL = {
  storeName: "TEST OK",
  invoiceNumber: "FONT-TEST",
  items: [
    { name: "Sample Item One", price: 120, qty: 2 },
    { name: "Sample Item Two", price: 45, qty: 1 },
  ],
  subtotal: 285,
  total: 285,
};

/** Lets each terminal pick whichever receipt font weight/boldness and sizes
 *  actually look best on its own printer/paper — thermal print quality
 *  varies enough by printer and driver that no single fixed look suits
 *  everyone. */
export function ReceiptFontSettings() {
  const [weight, setWeight] = useState(400);
  const [brandFs, setBrandFs] = useState(18);
  const [bodyFs, setBodyFs] = useState(13);
  const [grandFs, setGrandFs] = useState(13);

  const [boldness, setBoldness] = useState<EscposBoldness>("bold");
  const [brandSz, setBrandSz] = useState<SizeLevel>("large");
  const [bodySz, setBodySz] = useState<SizeLevel>("normal");
  const [grandSz, setGrandSz] = useState<SizeLevel>("normal");

  const [loaded, setLoaded] = useState(false);
  const [testingBrowser, setTestingBrowser] = useState(false);
  const [testingEscpos, setTestingEscpos] = useState(false);

  useEffect(() => {
    setWeight(getReceiptFontWeight());
    setBrandFs(getReceiptBrandFontSize());
    setBodyFs(getReceiptBodyFontSize());
    setGrandFs(getReceiptGrandFontSize());
    setBoldness(getEscposBoldness());
    setBrandSz(getBrandSizeLevel());
    setBodySz(getBodySizeLevel());
    setGrandSz(getGrandSizeLevel());
    setLoaded(true);
  }, []);

  async function testBrowser() {
    setTestingBrowser(true);
    try {
      await printReceipt(buildBillHtml(TEST_BILL));
      toast.success("Test slip sent to the browser print dialog");
    } catch (e) {
      console.error(e);
      toast.error("Test print failed");
    } finally {
      setTestingBrowser(false);
    }
  }

  async function testEscpos() {
    setTestingEscpos(true);
    try {
      await printBill(TEST_BILL);
      toast.success("Test slip sent");
    } catch (e) {
      console.error(e);
      toast.error("Test print failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTestingEscpos(false);
    }
  }

  if (!loaded) return null;

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Type className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <h2 className="section-title">Receipt Font</h2>
          <p className="section-subtitle">
            Weight and size for the brand name, body content, and grand total. Try a few and keep
            whichever looks best on this printer.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-8">
        {/* Browser / HTML print */}
        <div className="space-y-3">
          <label className="input-label">Browser Print (Windows kiosk / plain browser tab)</label>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Font Weight</p>
            <select
              value={weight}
              onChange={(e) => {
                const v = Number(e.target.value);
                setWeight(v);
                setReceiptFontWeight(v);
              }}
              className="input-field w-full"
            >
              {FONT_WEIGHT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.value})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Brand Name Size</p>
              <select
                value={brandFs}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBrandFs(v);
                  setReceiptBrandFontSize(v);
                }}
                className="input-field w-full"
              >
                {BRAND_FONT_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.value}px)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Body Content Size</p>
              <select
                value={bodyFs}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBodyFs(v);
                  setReceiptBodyFontSize(v);
                }}
                className="input-field w-full"
              >
                {BODY_FONT_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.value}px)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Grand Total Size</p>
              <select
                value={grandFs}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGrandFs(v);
                  setReceiptGrandFontSize(v);
                }}
                className="input-field w-full"
              >
                {GRAND_FONT_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.value}px)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={testBrowser}
              disabled={testingBrowser}
              className="btn btn-secondary whitespace-nowrap w-full sm:w-auto"
            >
              {testingBrowser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {testingBrowser ? "Printing…" : "Test"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Applies when a bill is printed through the normal browser print dialog or Chrome kiosk
            mode — not QZ Tray, Sunmi, USB, or RawBT.
          </p>
        </div>

        <div className="border-t border-border" />

        {/* ESC/POS thermal print */}
        <div className="space-y-3">
          <label className="input-label">Thermal / ESC-POS Print (QZ Tray, Sunmi, USB, RawBT)</label>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Boldness</p>
            <select
              value={boldness}
              onChange={(e) => {
                const v = e.target.value as EscposBoldness;
                setBoldness(v);
                setEscposBoldness(v);
              }}
              className="input-field w-full"
            >
              {ESCPOS_BOLDNESS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Brand Name Size</p>
              <select
                value={brandSz}
                onChange={(e) => {
                  const v = e.target.value as SizeLevel;
                  setBrandSz(v);
                  setBrandSizeLevel(v);
                }}
                className="input-field w-full"
              >
                {SIZE_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Body Content Size</p>
              <select
                value={bodySz}
                onChange={(e) => {
                  const v = e.target.value as SizeLevel;
                  setBodySz(v);
                  setBodySizeLevel(v);
                }}
                className="input-field w-full"
              >
                {SIZE_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Grand Total Size</p>
              <select
                value={grandSz}
                onChange={(e) => {
                  const v = e.target.value as SizeLevel;
                  setGrandSz(v);
                  setGrandSizeLevel(v);
                }}
                className="input-field w-full"
              >
                {SIZE_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={testEscpos}
              disabled={testingEscpos}
              className="btn btn-secondary whitespace-nowrap w-full sm:w-auto"
            >
              {testingEscpos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {testingEscpos ? "Printing…" : "Test"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Thermal printers only support a few discrete size steps, not a smooth range. This sends
            the test slip through whichever thermal path is currently active/available on this
            device (Sunmi → USB → QZ Tray → RawBT), falling back to the browser dialog if none are
            set up.
          </p>
        </div>
      </div>
    </section>
  );
}
