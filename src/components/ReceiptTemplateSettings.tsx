"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plus, Printer, ReceiptText, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import {
  DEFAULT_RECEIPT_CONFIG,
  MAX_EXTRA_LINES,
  MAX_LOGO_BYTES,
  type ReceiptConfig,
  type ReceiptLine,
} from "@/lib/receipt-template";
import type { ReceiptTemplateRow } from "@/lib/receipt-template-server";
import type { BillData } from "@/lib/print";
import { printBill } from "@/lib/qz-print";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import {
  assignReceiptTemplate,
  createReceiptTemplate,
  deleteReceiptTemplate,
  saveReceiptTemplate,
} from "@/app/actions/receipt-templates";

type Branch = { id: number; name: string; receiptTemplateId: number | null };
type Store = { storeName: string; phone: string | null; address: string | null; gstNumber: string | null };
type Draft = { name: string; config: ReceiptConfig; logo: string | null; logoChanged: boolean };

const toDraft = (t: ReceiptTemplateRow): Draft => ({ name: t.name, config: t.config, logo: t.logo, logoChanged: false });

/** Resizes an uploaded image to printer width and returns a data URL. */
async function fileToLogoDataUrl(file: File): Promise<string> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Not an image"));
      img.src = src;
    });
    const width = Math.min(576, img.naturalWidth);
    const height = Math.max(1, Math.round((img.naturalHeight * width) / img.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const png = canvas.toDataURL("image/png");
    return png.length <= MAX_LOGO_BYTES ? png : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(src);
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-bold text-sm text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      {label}
    </label>
  );
}

function LinesEditor({
  lines,
  onChange,
  placeholder,
}: {
  lines: ReceiptLine[];
  onChange: (l: ReceiptLine[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={l.text}
            maxLength={60}
            placeholder={placeholder}
            onChange={(e) => onChange(lines.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
            className="input-field flex-1"
          />
          <Check label="Bold" checked={l.bold} onChange={(v) => onChange(lines.map((x, j) => (j === i ? { ...x, bold: v } : x)))} />
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
            className="p-2 rounded-lg text-muted-foreground hover:text-rose-500"
            aria-label="Remove line"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {lines.length < MAX_EXTRA_LINES && (
        <button
          type="button"
          onClick={() => onChange([...lines, { text: "", bold: false }])}
          className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
      )}
    </div>
  );
}

export function ReceiptTemplateSettings({
  ready,
  templates: initialTemplates,
  branches: initialBranches,
  store,
}: {
  ready: boolean;
  templates: ReceiptTemplateRow[];
  branches: Branch[];
  store: Store;
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [branches, setBranches] = useState(initialBranches);
  const [selectedId, setSelectedId] = useState<number | null>(initialTemplates[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(initialTemplates[0] ? toDraft(initialTemplates[0]) : null);
  const [busy, setBusy] = useState<string | null>(null);

  const selected = templates.find((t) => t.id === selectedId) || null;
  const dirty =
    !!selected &&
    !!draft &&
    (draft.name !== selected.name || draft.logoChanged || JSON.stringify(draft.config) !== JSON.stringify(selected.config));

  const sampleBill: BillData = useMemo(
    () => ({
      storeName: store.storeName,
      phone: store.phone,
      address: store.address,
      gstNumber: store.gstNumber,
      logoUrl: "/billlogo.png",
      invoiceNumber: "INV-20261027-0012",
      dailyNo: 12,
      orderMode: "DINE_IN",
      date: new Date(),
      customerName: "Ravi",
      cashierName: "admin",
      tableName: "T4",
      paymentMethod: "Cash",
      items: [
        { name: "Chicken Biriyani", price: 180, qty: 2, hsn: "996331" },
        { name: "Parotta", price: 20, qty: 3, hsn: "996331" },
        { name: "Lime Juice", price: 40, qty: 1, hsn: "996331" },
      ],
      subtotal: 460,
      gstAmount: 23,
      discountAmount: 0,
      total: 483,
      template: draft ? { config: draft.config, logo: draft.logo } : null,
    }),
    [store, draft],
  );

  if (!ready) {
    return (
      <section className="card p-4 sm:p-6">
        <h2 className="section-title">Bill Design</h2>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
          Bill Design needs a one-time database update before it can be used. Bills keep printing with the
          standard layout until then.
        </p>
      </section>
    );
  }

  const set = (patch: Partial<ReceiptConfig>) => setDraft((d) => (d ? { ...d, config: { ...d.config, ...patch } } : d));

  function selectTemplate(id: number) {
    if (dirty && !confirm("Discard unsaved changes to this template?")) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSelectedId(id);
    setDraft(toDraft(t));
  }

  async function save() {
    if (!draft || !selectedId) return;
    setBusy("save");
    const res = await saveReceiptTemplate(selectedId, {
      name: draft.name,
      config: draft.config,
      ...(draft.logoChanged ? { logo: draft.logo } : {}),
    });
    setBusy(null);
    if (res.error) return toast.error(res.error);
    setTemplates((ts) =>
      ts.map((t) => (t.id === selectedId ? { ...t, name: draft.name.trim(), config: draft.config, logo: draft.logo } : t)),
    );
    setDraft({ ...draft, name: draft.name.trim(), logoChanged: false });
    toast.success("Bill design saved");
  }

  async function copyTemplate() {
    if (!selected) return;
    if (dirty) return toast.error("Save or discard your changes first");
    setBusy("copy");
    const res = await createReceiptTemplate(selected.id);
    setBusy(null);
    if (res.error || !res.id) return toast.error(res.error || "Could not copy");
    const copy: ReceiptTemplateRow = { ...selected, id: res.id, name: res.name! };
    setTemplates((ts) => [...ts, copy]);
    setSelectedId(copy.id);
    setDraft(toDraft(copy));
    toast.success(`${copy.name} created — edit it and press Save`);
  }

  async function removeTemplate() {
    if (!selected || !confirm(`Delete "${selected.name}"? Branches using it switch to the first template.`)) return;
    setBusy("delete");
    const res = await deleteReceiptTemplate(selected.id);
    setBusy(null);
    if (res.error) return toast.error(res.error);
    const rest = templates.filter((t) => t.id !== selected.id);
    setTemplates(rest);
    setBranches((bs) => bs.map((b) => (b.receiptTemplateId === selected.id ? { ...b, receiptTemplateId: null } : b)));
    setSelectedId(rest[0]?.id ?? null);
    setDraft(rest[0] ? toDraft(rest[0]) : null);
    toast.success("Template deleted");
  }

  async function assign(branchId: number, templateId: number | null) {
    const res = await assignReceiptTemplate(branchId, templateId);
    if (res.error) return toast.error(res.error);
    setBranches((bs) => bs.map((b) => (b.id === branchId ? { ...b, receiptTemplateId: templateId } : b)));
    toast.success("Branch template updated");
  }

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      if (dataUrl.length > MAX_LOGO_BYTES) return toast.error("Logo is too large — use a smaller image");
      setDraft((d) => (d ? { ...d, logo: dataUrl, logoChanged: true, config: { ...d.config, logo: "custom" } } : d));
    } catch {
      toast.error("Could not read that image — use a PNG or JPG");
    }
  }

  async function testPrint() {
    setBusy("print");
    try {
      await printBill(sampleBill);
      toast.success("Test bill sent to the printer");
    } catch {
      toast.error("Test print failed — check the printer settings below");
    } finally {
      setBusy(null);
    }
  }

  const c = draft?.config;
  const firstId = templates[0]?.id;

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <ReceiptText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="section-title">Bill Design</h2>
          <p className="section-subtitle">
            Choose what the printed bill shows. Each branch can use its own template.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Template picker */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <label className="input-label">Template</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => selectTemplate(Number(e.target.value))}
              className="input-field w-full mt-1"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="input-label">Name</label>
            <input
              value={draft?.name ?? ""}
              maxLength={40}
              onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
              className="input-field w-full mt-1"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copyTemplate} disabled={!!busy} className="btn btn-secondary">
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button
              type="button"
              onClick={removeTemplate}
              disabled={!!busy || templates.length <= 1}
              className="btn btn-secondary text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Branch assignment */}
        {branches.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template used by each branch</p>
            {branches.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground flex-1 truncate">{b.name}</span>
                <select
                  value={b.receiptTemplateId ?? firstId ?? ""}
                  onChange={(e) => assign(b.id, Number(e.target.value))}
                  className="input-field w-44"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {c && draft && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
            {/* ── Form ── */}
            <div className="space-y-4 min-w-0">
              <Section title="1. Header">
                <div className="flex flex-wrap items-center gap-4">
                  {(["default", "custom", "none"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={c.logo === v} onChange={() => set({ logo: v })} className="accent-primary" />
                      {v === "default" ? "Standard logo" : v === "custom" ? "My logo" : "No logo"}
                    </label>
                  ))}
                </div>
                {c.logo === "custom" && (
                  <label className="btn btn-secondary btn-sm w-fit cursor-pointer">
                    <Upload className="h-4 w-4" /> {draft.logo ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => onLogoFile(e.target.files?.[0])}
                    />
                  </label>
                )}
                {c.logo !== "none" && (
                  <div>
                    <label className="input-label">Logo size</label>
                    <select
                      value={c.logoSize}
                      onChange={(e) => set({ logoSize: e.target.value as ReceiptConfig["logoSize"] })}
                      className="input-field w-40 mt-1"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="input-label">Store name</label>
                    <input
                      value={c.storeName}
                      maxLength={60}
                      placeholder={store.storeName}
                      onChange={(e) => set({ storeName: e.target.value })}
                      className="input-field w-full mt-1"
                    />
                  </div>
                  <div className="pb-2">
                    <Check label="Bold" checked={c.storeNameBold} onChange={(v) => set({ storeNameBold: v })} />
                  </div>
                </div>
                {(
                  [
                    ["address", "showAddress", "Location / address", store.address],
                    ["phone", "showPhone", "Phone", store.phone],
                    ["gstin", "showGstin", "GSTIN", store.gstNumber],
                  ] as const
                ).map(([field, show, label, fallback]) => (
                  <div key={field} className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="input-label">{label}</label>
                      <input
                        value={c[field]}
                        maxLength={field === "address" ? 160 : 60}
                        placeholder={fallback || ""}
                        disabled={!c[show]}
                        onChange={(e) => set({ [field]: e.target.value } as Partial<ReceiptConfig>)}
                        className="input-field w-full mt-1 disabled:opacity-50"
                      />
                    </div>
                    <div className="pb-2">
                      <Check label="Show" checked={c[show]} onChange={(v) => set({ [show]: v } as Partial<ReceiptConfig>)} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Leave a box empty to use the branch&apos;s own details from Shop Details.
                </p>
                <div>
                  <label className="input-label">Extra lines (e.g. FSSAI No, Pure Veg)</label>
                  <div className="mt-1">
                    <LinesEditor lines={c.headerLines} onChange={(l) => set({ headerLines: l })} placeholder="FSSAI: 12345678901234" />
                  </div>
                </div>
              </Section>

              <Section title="2. Bill info">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Check label="Date & time" checked={c.showDate} onChange={(v) => set({ showDate: v })} />
                  <Check label="Bill No" checked={c.showBillNo} onChange={(v) => set({ showBillNo: v })} />
                  <Check label="Bill No big" checked={c.billNoBig} onChange={(v) => set({ billNoBig: v })} />
                  <Check label="Ref (INV) No" checked={c.showRef} onChange={(v) => set({ showRef: v })} />
                  <Check label="Customer name" checked={c.showCustomer} onChange={(v) => set({ showCustomer: v })} />
                  <Check label="Cashier" checked={c.showCashier} onChange={(v) => set({ showCashier: v })} />
                  <Check label="Table" checked={c.showTable} onChange={(v) => set({ showTable: v })} />
                </div>
              </Section>

              <Section title="3. Items">
                <div>
                  <label className="input-label">Extra column</label>
                  <select
                    value={c.extraColumn}
                    onChange={(e) => set({ extraColumn: e.target.value as ReceiptConfig["extraColumn"] })}
                    className="input-field w-48 mt-1"
                  >
                    <option value="none">None</option>
                    <option value="sno">S.No (1, 2, 3…)</option>
                    <option value="hsn">HSN code</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["item", "price", "qty", "value"] as const).map((k) => (
                    <div key={k}>
                      <label className="input-label capitalize">{k} heading</label>
                      <input
                        value={c.labels[k]}
                        maxLength={k === "item" ? 12 : k === "qty" ? 4 : k === "price" ? 8 : 10}
                        onChange={(e) => set({ labels: { ...c.labels, [k]: e.target.value } })}
                        className="input-field w-full mt-1"
                      />
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="4. Totals & payment">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Check label="Sub total" checked={c.showSubtotal} onChange={(v) => set({ showSubtotal: v })} />
                  <Check label="Discount" checked={c.showDiscount} onChange={(v) => set({ showDiscount: v })} />
                  <Check label="GST" checked={c.showGst} onChange={(v) => set({ showGst: v })} />
                  <Check label="Split CGST + SGST" checked={c.splitGst} onChange={(v) => set({ splitGst: v })} />
                  <Check label="Round off" checked={c.showRoundOff} onChange={(v) => set({ showRoundOff: v })} />
                  <Check label="Grand total bold" checked={c.grandBold} onChange={(v) => set({ grandBold: v })} />
                  <Check label="Tender amount" checked={c.showTender} onChange={(v) => set({ showTender: v })} />
                  <Check label="Payment mode" checked={c.showPaymentMode} onChange={(v) => set({ showPaymentMode: v })} />
                  <Check label="Dine-in / Takeaway" checked={c.showOrderType} onChange={(v) => set({ showOrderType: v })} />
                </div>
              </Section>

              <Section title="5. Dividers & footer">
                <div>
                  <label className="input-label">Divider style</label>
                  <select
                    value={c.divider}
                    onChange={(e) => set({ divider: e.target.value as ReceiptConfig["divider"] })}
                    className="input-field w-56 mt-1"
                  >
                    <option value="classic">Classic (===== and -----)</option>
                    <option value="dash">Dashes (-----)</option>
                    <option value="double">Double (=====)</option>
                    <option value="dot">Dots (.....)</option>
                    <option value="blank">Blank space</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Footer lines</label>
                  <div className="mt-1">
                    <LinesEditor lines={c.footerLines} onChange={(l) => set({ footerLines: l })} placeholder="Thank You! Visit Again!!" />
                  </div>
                </div>
              </Section>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={!dirty || !!busy} className="btn btn-primary">
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </button>
                <button type="button" onClick={testPrint} disabled={!!busy} className="btn btn-secondary">
                  {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print Test
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((d) => (d ? { ...d, config: DEFAULT_RECEIPT_CONFIG } : d))}
                  disabled={!!busy}
                  className="btn btn-ghost"
                >
                  <RotateCcw className="h-4 w-4" /> Reset to standard
                </button>
                {dirty && <span className="text-xs text-amber-600 dark:text-amber-400 self-center">Unsaved changes</span>}
              </div>
            </div>

            {/* ── Live preview ── */}
            <div className="lg:sticky lg:top-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                Live preview
              </p>
              <div className="rounded-xl border border-border bg-neutral-200 dark:bg-neutral-800 p-3 overflow-auto max-h-[80vh]">
                <ReceiptPreview bill={sampleBill} className="shadow-md" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
