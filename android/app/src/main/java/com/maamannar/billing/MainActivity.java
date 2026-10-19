package com.maamannar.billing;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SunmiPrinterPlugin.class);
        registerPlugin(UsbPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
