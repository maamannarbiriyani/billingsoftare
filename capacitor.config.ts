import type { CapacitorConfig } from '@capacitor/cli';

// Same idea as Start-POS-Printer.bat's POS_URL: the app is a thin native
// shell around the existing live web app, not a bundled offline build.
// Change this to your real site before building a release APK.
const POS_URL = 'https://www.maamannarbiriyani.com/billing';

const config: CapacitorConfig = {
  appId: 'com.maamannar.billing',
  appName: 'Maamannar Billing',
  webDir: 'capacitor-www',
  server: {
    url: POS_URL,
    cleartext: false,
  },
};

export default config;
