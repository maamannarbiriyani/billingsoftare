"use client";

import { useEffect, useState } from "react";
import { Printer, Check, RefreshCw, Loader2, Usb, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  isNativeApp,
  listUsbDevices,
  pickLikelyPrinter,
  requestUsbPermission,
  getSavedPrinterDeviceId,
  savePrinterDeviceId,
  type UsbDeviceInfo,
} from "@/lib/native-usb-print";
import { buildBillEscPos } from "@/lib/qz-print";

export function NativeUsbPrinterSettings() {
  const [native, setNative] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [devices, setDevices] = useState<UsbDeviceInfo[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
    setSelected(getSavedPrinterDeviceId());
    setLoaded(true);
    if (isNativeApp()) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scan() {
    setScanning(true);
    try {
      const list = await listUsbDevices();
      setDevices(list);
      if (list.length === 0) {
        toast.error("No USB device found — check the printer is plugged in");
      } else if (selected === null) {
        const guess = pickLikelyPrinter(list);
        if (guess) {
          setSelected(guess.deviceId);
          savePrinterDeviceId(guess.deviceId);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not scan for USB devices");
    } finally {
      setScanning(false);
    }
  }

  function selectDevice(deviceId: number) {
    setSelected(deviceId);
    savePrinterDeviceId(deviceId);
  }

  async function grantPermission() {
    if (selected === null) return;
    try {
      const ok = await requestUsbPermission(selected);
      toast[ok ? "success" : "error"](ok ? "USB permission granted" : "Permission denied");
      scan();
    } catch (e) {
      console.error(e);
      toast.error("Permission request failed");
    }
  }

  async function test() {
    if (selected === null) return;
    setTesting(true);
    try {
      const { printUsbRaw } = await import("@/lib/native-usb-print");
      const slip =
        await buildBillEscPos({
          storeName: "TEST OK",
          invoiceNumber: "USB-TEST",
          items: [{ name: "USB plugin", price: 0, qty: 1 }],
          subtotal: 0,
          total: 0,
        });
      await printUsbRaw(slip);
      toast.success("Test slip sent to printer");
    } catch (e) {
      console.error(e);
      toast.error("Test print failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTesting(false);
    }
  }

  if (!loaded || !native) return null;

  const selectedDevice = devices.find((d) => d.deviceId === selected);

  return (
    <section className="card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Usb className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <h2 className="section-title">Thermal Printer (USB, built-in)</h2>
          <p className="section-subtitle">
            Talks directly to a USB receipt printer from this app — no third-party app needed.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selected ?? ""}
            onChange={(e) => selectDevice(Number(e.target.value))}
            className="input-field flex-1"
          >
            <option value="" disabled>
              {devices.length === 0 ? "No USB devices found" : "Select a device"}
            </option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.deviceName} (VID {d.vendorId}, PID {d.productId})
                {d.isPrinterClass ? " — printer" : ""}
              </option>
            ))}
          </select>
          <button type="button" onClick={scan} disabled={scanning} className="btn btn-secondary whitespace-nowrap">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Scan"}
          </button>
        </div>

        {selectedDevice && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            {selectedDevice.hasPermission ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold text-foreground flex-1">
              {selectedDevice.hasPermission ? "USB permission granted" : "USB permission not granted yet"}
            </span>
            {!selectedDevice.hasPermission && (
              <button type="button" onClick={grantPermission} className="text-xs font-semibold text-primary hover:underline">
                Grant
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={test} disabled={testing || selected === null} className="btn btn-primary w-full sm:w-auto">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {testing ? "Printing…" : "Print Test Slip"}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" /> One-time setup on this device
          </p>
          <p>1. Plug in the USB printer, tap “Scan”, and select it from the list.</p>
          <p>2. Tap “Grant” and allow the Android USB permission prompt.</p>
          <p>3. Tap “Print Test Slip” to confirm it works.</p>
        </div>
      </div>
    </section>
  );
}
