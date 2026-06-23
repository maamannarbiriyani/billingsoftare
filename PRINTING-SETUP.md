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

## Two printers (bill on counter, KOT in kitchen)?

Windows only has one *default* printer, so kiosk mode sends everything there.
For separate counter + kitchen printers you need a small local print agent
(e.g. a Node/QZ-Tray helper that talks ESC/POS to each printer by name).
Ask to enable the **print-agent** option if you need this.
