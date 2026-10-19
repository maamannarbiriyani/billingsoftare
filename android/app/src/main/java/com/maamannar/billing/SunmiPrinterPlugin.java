package com.maamannar.billing;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;

/**
 * Bridges to Sunmi's built-in thermal printer via their official SDK
 * (com.sunmi:printerlibrary — see android/app/build.gradle), which wraps the
 * woyou.aidlservice.jiuiv5 AIDL service that differs across device/firmware
 * versions. Only present/functional on Sunmi terminals with a built-in
 * printer; on any other device bindService() simply never connects and every
 * call below fails fast, which src/lib/qz-print.ts's printBill()/printKot()
 * treats as "try the next tier" (native USB → QZ Tray → RawBT → browser).
 */
@CapacitorPlugin(name = "SunmiPrinter")
public class SunmiPrinterPlugin extends Plugin {
    private static final String TAG = "SunmiPrinterPlugin";
    private static final long BIND_TIMEOUT_MS = 3000;

    private final Object lock = new Object();
    private volatile SunmiPrinterService service;
    private volatile boolean bindAttempted = false;

    private final InnerPrinterCallback callback = new InnerPrinterCallback() {
        @Override
        public void onConnected(SunmiPrinterService connectedService) {
            synchronized (lock) {
                service = connectedService;
                lock.notifyAll();
            }
        }

        @Override
        public void onDisconnected() {
            synchronized (lock) {
                service = null;
                lock.notifyAll();
            }
        }
    };

    @Override
    public void load() {
        // Kick off the bind as soon as the app starts — most calls will find
        // `service` already set by the time a receipt needs printing, rather
        // than paying the connect latency on the first print.
        tryBind();
    }

    private void tryBind() {
        if (bindAttempted) return;
        bindAttempted = true;
        try {
            boolean started = InnerPrinterManager.getInstance().bindService(getContext(), callback);
            if (!started) {
                Log.i(TAG, "Sunmi inner printer service not present on this device");
            }
        } catch (InnerPrinterException e) {
            Log.i(TAG, "Sunmi inner printer bindService failed — not a Sunmi device or SDK unavailable", e);
        }
    }

    /** Blocks the calling (background, per Capacitor's default) thread until connected or timed out. */
    private SunmiPrinterService awaitService() {
        if (service != null) return service;
        tryBind();
        synchronized (lock) {
            long deadline = System.currentTimeMillis() + BIND_TIMEOUT_MS;
            while (service == null) {
                long remaining = deadline - System.currentTimeMillis();
                if (remaining <= 0) break;
                try {
                    lock.wait(remaining);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            return service;
        }
    }

    /** True only when this device actually has a bound, working Sunmi printer. */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        SunmiPrinterService s = awaitService();
        boolean available = false;
        if (s != null) {
            try {
                available = InnerPrinterManager.getInstance().hasPrinter(s);
            } catch (InnerPrinterException e) {
                Log.w(TAG, "hasPrinter() check failed", e);
            }
        }
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    /** Sends raw ESC/POS bytes (base64-encoded) straight to the built-in printer. */
    @PluginMethod
    public void print(PluginCall call) {
        String dataBase64 = call.getString("dataBase64");
        if (dataBase64 == null || dataBase64.isEmpty()) {
            call.reject("dataBase64 is required");
            return;
        }
        SunmiPrinterService s = awaitService();
        if (s == null) {
            call.reject("Sunmi built-in printer service unavailable on this device");
            return;
        }
        try {
            byte[] bytes = Base64.decode(dataBase64, Base64.DEFAULT);
            // No ICallback needed — buildBillEscPos()/buildKotEscPos() on the JS
            // side already include the full init/cut sequence, so this is fire-
            // and-forget just like the USB and RawBT print paths.
            s.sendRAWData(bytes, null);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Sunmi print failed: " + e.getMessage(), e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            InnerPrinterManager.getInstance().unBindService(getContext(), callback);
        } catch (Exception e) {
            // best-effort cleanup only
        }
        super.handleOnDestroy();
    }
}
