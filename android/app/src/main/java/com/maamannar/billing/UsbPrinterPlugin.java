package com.maamannar.billing;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Talks directly to an external USB ESC/POS thermal printer via Android's
 * USB Host API — bypasses Android's print framework entirely (confirmed
 * on-device it has no USB support, only network/Wi-Fi printers). Used by
 * src/lib/native-usb-print.ts as the fallback tier when the device isn't a
 * Sunmi terminal with a built-in printer (see SunmiPrinterPlugin), e.g. an
 * external RP326 plugged into a Sunmi/Android device's USB-A port.
 */
@CapacitorPlugin(name = "UsbPrinter")
public class UsbPrinterPlugin extends Plugin {
    private static final String TAG = "UsbPrinterPlugin";
    private static final String ACTION_USB_PERMISSION = "com.maamannar.billing.USB_PERMISSION";

    // One pending PluginCall per in-flight permission request, keyed by device id —
    // resolved from the broadcast receiver once the user answers Android's prompt.
    private final Map<Integer, PluginCall> pendingPermissionCalls = new ConcurrentHashMap<>();

    private final BroadcastReceiver usbPermissionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!ACTION_USB_PERMISSION.equals(intent.getAction())) return;
            UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            if (device == null) return;
            boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
            PluginCall call = pendingPermissionCalls.remove(device.getDeviceId());
            if (call != null) {
                JSObject ret = new JSObject();
                ret.put("granted", granted);
                call.resolve(ret);
            }
        }
    };

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(usbPermissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(usbPermissionReceiver, filter);
        }
    }

    private UsbManager usbManager() {
        return (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
    }

    /** A USB interface with class PRINTER (7) — the standard USB printer device class. */
    private static boolean isPrinterClass(UsbDevice device) {
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            if (device.getInterface(i).getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                return true;
            }
        }
        return false;
    }

    @PluginMethod
    public void list(PluginCall call) {
        UsbManager manager = usbManager();
        Map<String, UsbDevice> deviceList = manager.getDeviceList();
        JSArray devices = new JSArray();
        for (UsbDevice device : deviceList.values()) {
            JSObject d = new JSObject();
            d.put("deviceId", device.getDeviceId());
            d.put("vendorId", device.getVendorId());
            d.put("productId", device.getProductId());
            d.put("deviceName", device.getDeviceName());
            d.put("isPrinterClass", isPrinterClass(device));
            d.put("hasPermission", manager.hasPermission(device));
            devices.put(d);
        }
        JSObject ret = new JSObject();
        ret.put("devices", devices);
        call.resolve(ret);
    }

    private UsbDevice findDevice(int deviceId) {
        for (UsbDevice device : usbManager().getDeviceList().values()) {
            if (device.getDeviceId() == deviceId) return device;
        }
        return null;
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        Integer deviceId = call.getInt("deviceId");
        UsbDevice device = deviceId == null ? null : findDevice(deviceId);
        JSObject ret = new JSObject();
        ret.put("granted", device != null && usbManager().hasPermission(device));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Integer deviceId = call.getInt("deviceId");
        UsbDevice device = deviceId == null ? null : findDevice(deviceId);
        if (device == null) {
            call.reject("USB device not found — was it unplugged?");
            return;
        }
        UsbManager manager = usbManager();
        if (manager.hasPermission(device)) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
        PendingIntent permissionIntent = PendingIntent.getBroadcast(
            getContext(), deviceId, new Intent(ACTION_USB_PERMISSION), flags
        );
        pendingPermissionCalls.put(deviceId, call);
        manager.requestPermission(device, permissionIntent);
        // Resolved asynchronously by usbPermissionReceiver when Android's
        // permission dialog is answered — Capacitor keeps this PluginCall
        // alive across that gap.
        call.setKeepAlive(true);
    }

    /** First bulk OUT endpoint on the device's first usable interface — thermal printers expose exactly one. */
    private static UsbEndpoint findBulkOutEndpoint(UsbInterface intf) {
        for (int i = 0; i < intf.getEndpointCount(); i++) {
            UsbEndpoint ep = intf.getEndpoint(i);
            if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                return ep;
            }
        }
        return null;
    }

    @PluginMethod
    public void print(PluginCall call) {
        Integer deviceId = call.getInt("deviceId");
        String dataBase64 = call.getString("dataBase64");
        if (deviceId == null || dataBase64 == null || dataBase64.isEmpty()) {
            call.reject("deviceId and dataBase64 are required");
            return;
        }
        UsbDevice device = findDevice(deviceId);
        if (device == null) {
            call.reject("USB printer not found — was it unplugged?");
            return;
        }
        UsbManager manager = usbManager();
        if (!manager.hasPermission(device)) {
            call.reject("USB permission not granted for this printer");
            return;
        }

        UsbInterface printerInterface = null;
        UsbEndpoint outEndpoint = null;
        for (int i = 0; i < device.getInterfaceCount() && outEndpoint == null; i++) {
            UsbInterface candidate = device.getInterface(i);
            UsbEndpoint ep = findBulkOutEndpoint(candidate);
            if (ep != null) {
                printerInterface = candidate;
                outEndpoint = ep;
            }
        }
        if (printerInterface == null || outEndpoint == null) {
            call.reject("No bulk OUT endpoint found on this USB device — is it a printer?");
            return;
        }

        UsbDeviceConnection connection = manager.openDevice(device);
        if (connection == null) {
            call.reject("Could not open USB connection to printer");
            return;
        }
        try {
            if (!connection.claimInterface(printerInterface, true)) {
                call.reject("Could not claim USB interface — printer may be in use");
                return;
            }
            byte[] bytes = Base64.decode(dataBase64, Base64.DEFAULT);
            // Thermal printers commonly reject/truncate very large single bulk
            // transfers — chunk to the endpoint's max packet size to be safe.
            int chunkSize = Math.max(64, outEndpoint.getMaxPacketSize());
            int offset = 0;
            while (offset < bytes.length) {
                int len = Math.min(chunkSize, bytes.length - offset);
                int sent = connection.bulkTransfer(outEndpoint, bytes, offset, len, 5000);
                if (sent < 0) {
                    call.reject("USB write failed at offset " + offset);
                    return;
                }
                offset += sent;
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } finally {
            try {
                connection.releaseInterface(printerInterface);
            } catch (Exception ignored) {}
            connection.close();
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(usbPermissionReceiver);
        } catch (Exception ignored) {}
        super.handleOnDestroy();
    }
}
