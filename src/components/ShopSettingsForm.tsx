"use client";

import { useState } from "react";
import { updateSettings } from "@/app/actions/settings";
import { Save, Store, ShieldCheck, MapPin, Printer, AlertCircle, CheckCircle, Phone, Percent } from "lucide-react";
import { toast } from "sonner";

type ShopSettingsFormProps = {
  initialData?: {
    storeName: string;
    phone?: string | null;
    gstNumber: string | null;
    gstPercent?: number | null;
    address: string | null;
    printerName?: string | null;
  } | null;
};

export function ShopSettingsForm({ initialData }: ShopSettingsFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setMessage(null);
    const result = await updateSettings(formData);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.success) {
      setMessage({ type: "success", text: "Settings saved successfully!" });
    }
    setIsPending(false);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Message Alert */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
          }`}
        >
          {message.type === "success"
            ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
            : <AlertCircle className="h-4 w-4 flex-shrink-0" />
          }
          {message.text}
        </div>
      )}

      {/* Store Name */}
      <div>
        <label htmlFor="storeName" className="input-label">
          <span className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            Store Name
            <span className="text-rose-500">*</span>
          </span>
        </label>
        <input
          type="text"
          name="storeName"
          id="storeName"
          required
          defaultValue={initialData?.storeName || "My Retail Store"}
          placeholder="Your store name"
          className="input-field mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1.5">This name appears on all printed receipts</p>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="input-label">
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            Phone Number
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
        </label>
        <input
          type="text"
          name="phone"
          id="phone"
          defaultValue={initialData?.phone || ""}
          placeholder="e.g. 9944970360"
          className="input-field mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Shown on receipts below the store name</p>
      </div>

      {/* GST Number */}
      <div>
        <label htmlFor="gstNumber" className="input-label">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            GST / Tax Number
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
        </label>
        <input
          type="text"
          name="gstNumber"
          id="gstNumber"
          defaultValue={initialData?.gstNumber || ""}
          placeholder="e.g. 29ABCDE1234F1Z5"
          className="input-field mt-1 font-mono tracking-wider"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Printed below the store name on receipts</p>
      </div>

      {/* GST Percent */}
      <div>
        <label htmlFor="gstPercent" className="input-label">
          <span className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            Default GST Rate (%)
          </span>
        </label>
        <input
          type="number"
          name="gstPercent"
          id="gstPercent"
          min="0"
          max="100"
          step="0.01"
          defaultValue={initialData?.gstPercent ?? 0}
          placeholder="e.g. 5"
          className="input-field mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Applied automatically in billing when GST is enabled. Set to 0 to disable.
        </p>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="input-label">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Store Address
            <span className="text-muted-foreground font-normal">(Optional)</span>
          </span>
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={initialData?.address || ""}
          placeholder="Full store address"
          className="input-field mt-1 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Shown on customer receipts and invoices</p>
      </div>

      {/* Printer Connection */}
      <div className="pt-4 border-t border-border">
        <label className="input-label">
          <span className="flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            Receipt Printer Connection
          </span>
        </label>
        <div className="flex flex-col sm:flex-row gap-3 mt-1">
          <input
            type="text"
            name="printerName"
            id="printerName"
            defaultValue={initialData?.printerName || ""}
            placeholder="No printer connected"
            className="input-field flex-1 bg-muted"
            readOnly
          />
          <button
            type="button"
            onClick={async () => {
              try {
                if ('serial' in navigator) {
                  // @ts-ignore
                  const port = await navigator.serial.requestPort();
                  const info = port.getInfo();
                  const printerId = `USB Printer (VID: ${info.usbVendorId || 'Unknown'})`;
                  const input = document.getElementById('printerName') as HTMLInputElement;
                  if (input) input.value = printerId;
                } else {
                toast.error("Live printer detection (Web Serial API) is only supported in Chrome, Edge, or the native Desktop App.");
                }
              } catch (err) {
                // User closing the browser's port picker throws NotFoundError —
                // that's a normal cancel, not a bug, so don't log it as an error
                // (Next.js dev overlay surfaces console.error as a crash).
                if (err instanceof Error && err.name === "NotFoundError") return;
                console.error("Printer connection failed", err);
                toast.error("Could not connect to the printer.");
              }
            }}
            className="btn btn-secondary whitespace-nowrap w-full sm:w-auto"
          >
            Detect &amp; Connect
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Connect a live USB/Serial thermal printer for billing output.</p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary w-full sm:w-auto"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
