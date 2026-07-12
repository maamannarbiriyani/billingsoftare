"use client";

// ─────────────────────────────────────────────────────────────
// Bridge to the native UsbPrinterPlugin (android/app/src/main/java/com/
// maamannar/billing/UsbPrinterPlugin.kt). Talks directly to a USB ESC/POS
// thermal printer via Android's USB Host API — bypassing Android's print
// framework entirely, which has no USB support (confirmed on-device: only
// network/Wi-Fi printers). This only works inside the native app shell
// (Capacitor); it's a no-op in a normal mobile/desktop browser tab, where
// the RawBT or QZ Tray paths in qz-print.ts are used instead.
// ─────────────────────────────────────────────────────────────

import { registerPlugin, Capacitor } from "@capacitor/core";

export type UsbDeviceInfo = {
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceName: string;
  isPrinterClass: boolean;
  hasPermission: boolean;
};

interface UsbPrinterPluginApi {
  list(): Promise<{ devices: UsbDeviceInfo[] }>;
  hasPermission(opts: { deviceId: number }): Promise<{ granted: boolean }>;
  requestPermission(opts: { deviceId: number }): Promise<{ granted: boolean }>;
  print(opts: { deviceId: number; dataBase64: string }): Promise<{ success: boolean }>;
}

const UsbPrinter = registerPlugin<UsbPrinterPluginApi>("UsbPrinter");

/** True only inside the native app shell — false in any browser tab (mobile or desktop). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

const LS_DEVICE_ID = "native_usb_printer_device_id";

export function getSavedPrinterDeviceId(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(LS_DEVICE_ID);
  return v ? Number(v) : null;
}

export function savePrinterDeviceId(deviceId: number | null) {
  if (typeof window === "undefined") return;
  if (deviceId === null) localStorage.removeItem(LS_DEVICE_ID);
  else localStorage.setItem(LS_DEVICE_ID, String(deviceId));
}

export async function listUsbDevices(): Promise<UsbDeviceInfo[]> {
  const { devices } = await UsbPrinter.list();
  return devices;
}

/** Best-guess printer from a device list — prefers ones Android already classifies as printer-class. */
export function pickLikelyPrinter(devices: UsbDeviceInfo[]): UsbDeviceInfo | undefined {
  return devices.find((d) => d.isPrinterClass) ?? devices[0];
}

export async function requestUsbPermission(deviceId: number): Promise<boolean> {
  const { granted } = await UsbPrinter.requestPermission({ deviceId });
  return granted;
}

function toBase64(escpos: string): string {
  try {
    return btoa(escpos);
  } catch {
    // Non-Latin1 chars (e.g. non-English item names) can't go through btoa directly.
    return btoa(unescape(encodeURIComponent(escpos)));
  }
}

/** Send raw ESC/POS text straight to the saved USB printer. Throws if none is configured/paired. */
export async function printUsbRaw(escpos: string): Promise<void> {
  const deviceId = getSavedPrinterDeviceId();
  if (deviceId === null) throw new Error("No USB printer configured — set one up in Settings.");
  const { granted } = await UsbPrinter.hasPermission({ deviceId });
  if (!granted) {
    const ok = await requestUsbPermission(deviceId);
    if (!ok) throw new Error("USB permission was not granted for the printer.");
  }
  await UsbPrinter.print({ deviceId, dataBase64: toBase64(escpos) });
}
