"use client";

import { useState } from "react";
import { updateSettings } from "@/app/actions/settings";
import { Save, Store, ShieldCheck, MapPin, Printer, AlertCircle, CheckCircle, Phone } from "lucide-react";

type ShopSettingsFormProps = {
  initialData?: {
    storeName: string;
    phone?: string | null;
    gstNumber: string | null;
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
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
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
            <Store className="h-3.5 w-3.5 text-slate-400" />
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
        <p className="text-xs text-slate-400 mt-1.5">This name appears on all printed receipts</p>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="input-label">
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            Phone Number
            <span className="text-slate-400 font-normal">(Optional)</span>
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
        <p className="text-xs text-slate-400 mt-1.5">Shown on receipts below the store name</p>
      </div>

      {/* GST Number */}
      <div>
        <label htmlFor="gstNumber" className="input-label">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            GST / Tax Number
            <span className="text-slate-400 font-normal">(Optional)</span>
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
        <p className="text-xs text-slate-400 mt-1.5">Printed below the store name on receipts</p>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="input-label">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            Store Address
            <span className="text-slate-400 font-normal">(Optional)</span>
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
        <p className="text-xs text-slate-400 mt-1.5">Shown on customer receipts and invoices</p>
      </div>

      {/* Printer Connection */}
      <div className="pt-4 border-t border-slate-100">
        <label className="input-label">
          <span className="flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            Receipt Printer Connection
          </span>
        </label>
        <div className="flex gap-3 mt-1">
          <input
            type="text"
            name="printerName"
            id="printerName"
            defaultValue={initialData?.printerName || ""}
            placeholder="No printer connected"
            className="input-field flex-1 bg-slate-50"
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
                console.error("Printer connection cancelled or failed", err);
              }
            }}
            className="btn btn-secondary whitespace-nowrap"
          >
            Detect & Connect
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Connect a live USB/Serial thermal printer for billing output.</p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary"
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
