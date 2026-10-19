# 🖨️ Thermal Printer Setup (Silent Auto-Printing)

This POS prints **80mm thermal receipts** (customer bill + kitchen KOT).

## Why it sometimes "opens a PDF" instead of printing

A web browser **cannot** silently print to a printer for security reasons —
`window.print()` always shows a dialog, and if Windows' default printer is
*"Microsoft Print to PDF"*, you get a PDF instead of a paper receipt.

There is **one** supported way to make a browser print silently:
**Chrome Kiosk Printing mode.** This project ships a launcher for it.

---

## ✅ One-time setup

### 1. Set the thermal printer as the Windows default
- `Settings → Bluetooth & devices → Printers & scanners`
- Turn **OFF** *"Let Windows manage my default printer"*
- Click your thermal printer → **Set as default**

### 2. Set the paper size to 80mm (roll)
- In the printer's properties, set paper width to **80mm** (or 72mm printable)
- Set margins to **0**

### 3. Edit the launcher
- Open **`Start-POS-Printer.bat`** in Notepad
- Change `POS_URL` to your real site, e.g.
  `https://billingsoftware.vercel.app/billing`
- Save

### 4. Run the POS from the launcher
- Double-click **`Start-POS-Printer.bat`**
- Chrome opens in **kiosk-printing mode**
- Now **every bill / KOT prints instantly** — no dialog, no PDF

> 💡 Pin `Start-POS-Printer.bat` to the taskbar or copy a shortcut to the
> Desktop / Startup folder so staff always open the POS this way.

---

## How printing works now

| Receipt | When it prints | Goes to |
|---|---|---|
| **Customer bill** | "Print Bill & Settle" at checkout | Default printer |
| **Kitchen KOT** | When "Kitchen Copy" toggle is ON at checkout, or "Kitchen Copy" button on an invoice | Default printer |
| **Park / KOT** (dine-in) | "Send to Kitchen" | Default printer |

- Receipts print through a **hidden iframe** — popup blockers can no longer
  stop the KOT from printing.
- In normal Chrome (not the launcher) the print **dialog** appears — pick the
  thermal printer and click Print. Use the launcher for fully silent printing.

---

## 🐞 Bill sometimes prints tiny / needs a reprint to look right

**Cause:** `Start-POS-Printer.bat` uses Chrome's `--kiosk-printing` mode,
which prints with **no dialog at all** — it silently reuses whatever paper
size, margins, and scale Chrome *last used* for that printer (Chrome calls
these "sticky" print settings). It does **not** re-read the printer driver's
default paper size on every print. If that stored choice is ever wrong —
most commonly Chrome falling back to **A4/Letter** instead of the 80mm
receipt size for one particular job — the receipt content (sized for 80mm)
gets shrunk to fit that much bigger page, so it prints out tiny. The next
print can come out fine again if Chrome's guess happens to match that time,
which is why it looks random and "just reprinting" often fixes it.

**Fix — calibrate once:**
1. Close any running kiosk POS window.
2. Double-click **`Calibrate-Printer.bat`** (edit its `POS_URL` to match
   `Start-POS-Printer.bat` first, if you haven't already). This opens the
   *same* Chrome profile the kiosk launcher uses, but with the normal print
   dialog enabled.
3. Print any bill (or press Ctrl+P). In the dialog, click **"More
   settings"** and explicitly set:
   - **Paper size:** the 80mm / receipt size — not A4, not Letter
   - **Margins:** None
   - **Scale:** 100 (Default)
4. Click **Print**. This locks those exact settings into Chrome's sticky
   preferences for that printer.
5. Close the window and go back to using `Start-POS-Printer.bat` as normal —
   silent prints will now consistently reuse the correct size.

Re-run `Calibrate-Printer.bat` any time the printer is reinstalled, its
driver is updated, or Windows' default printer changes — any of those can
reset which paper size Chrome falls back to.

---

## Two printers (bill on counter, KOT in kitchen)?

Windows only has one *default* printer, so kiosk mode sends everything there.
For separate counter + kitchen printers you need a small local print agent
(e.g. a Node/QZ-Tray helper that talks ESC/POS to each printer by name).
Ask to enable the **print-agent** option if you need this.

---

## 📱 Sunmi / Android terminals (built-in printer)

A browser tab (even Chrome on the Sunmi device itself) **cannot** reach a
Sunmi terminal's built-in printer — Android's normal print dialog doesn't
expose it, and there's no silent-print flag like desktop Chrome's
`--kiosk-printing`. This project ships a thin native app shell (Capacitor)
under `/android` for exactly this: same web app, same UI, with two extra
native print paths bridged in:

| Printer | Native plugin | Used when |
|---|---|---|
| Sunmi built-in | `SunmiPrinterPlugin.java` | Always tried first inside the app |
| External USB (e.g. RP326 into a Sunmi USB-A port) | `UsbPrinterPlugin.java` | If no built-in printer is detected |

No changes to the billing UI, checkout flow, or backend were needed — both
plugins just receive the same ESC/POS bytes the QZ Tray / RawBT paths
already build (`buildBillEscPos` / `buildKotEscPos` in `src/lib/qz-print.ts`).

### One-time build & install

1. Edit `capacitor.config.ts` — set `POS_URL` to your real site (same value
   as `Start-POS-Printer.bat`'s `POS_URL`).
2. `npm install`
3. `npx cap sync android`
4. Open the `android/` folder in Android Studio (or run
   `cd android && ./gradlew assembleDebug` from a terminal with the Android
   SDK installed) and build/install the APK onto the Sunmi device.
5. Open the app, go to **Settings**, and check the **Thermal Printer (Sunmi
   built-in)** card shows "Built-in printer detected", then tap **Print Test
   Slip**.
6. If instead an external USB printer is plugged in, use the **Thermal
   Printer (USB, built-in)** card below it — scan, select the device, grant
   the USB permission prompt, then test print.

Printing is then fully silent and one-tap from checkout — no printer picker,
no PDF prompt, on either path.

**Build fails with an SSL/PKIX error fetching `com.sunmi:printerlibrary`
from Maven Central?** That's the JDK's bundled trust store rejecting a cert
your Windows install already trusts (common behind antivirus HTTPS
scanning or a corporate proxy) — not a project problem. Work around it by
building with the OS trust store instead:
`./gradlew assembleDebug -Djavax.net.ssl.trustStoreType=Windows-ROOT`
