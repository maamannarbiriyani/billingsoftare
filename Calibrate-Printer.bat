@echo off
REM ============================================================
REM   POS — Printer Calibration (run this ONCE, or whenever bills
REM   start printing too small / need a reprint to look right)
REM ------------------------------------------------------------
REM   Start-POS-Printer.bat uses Chrome's "--kiosk-printing" mode,
REM   which prints with NO dialog — it silently reuses whatever
REM   paper size / margins / scale Chrome last used for this
REM   printer. If that stored choice is ever wrong (e.g. Chrome
REM   fell back to A4/Letter instead of the 80mm receipt paper),
REM   EVERY silent print comes out shrunk to fit that page, until
REM   you print once through the real dialog and pick the right
REM   settings again.
REM
REM   This script opens the SAME Chrome profile used for kiosk
REM   printing, but WITHOUT --kiosk-printing, so the print dialog
REM   actually appears.
REM
REM   HOW TO USE:
REM   1. Close any running kiosk POS window first.
REM   2. Double-click this file. Chrome opens normally.
REM   3. Go to the billing page and print any bill (Ctrl+P also works).
REM   4. In the print dialog, click "More settings" and set:
REM        - Destination: your thermal printer
REM        - Paper size:  the 80mm / receipt size (NOT A4 or Letter)
REM        - Margins:     None
REM        - Scale:       100 (Default)
REM   5. Click Print. This locks those settings in for next time.
REM   6. Close this window and go back to using Start-POS-Printer.bat
REM      for normal silent printing.
REM ============================================================

REM Keep this the same as POS_URL in Start-POS-Printer.bat
SET "POS_URL=https://www.maamannarbiriyani.com/billing"

REM --- Find Chrome ---
SET "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
IF NOT EXIST "%CHROME%" SET "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
IF NOT EXIST "%CHROME%" SET "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

IF NOT EXIST "%CHROME%" (
  echo Google Chrome was not found. Please install Chrome.
  pause
  exit /b 1
)

REM --- Launch WITHOUT --kiosk-printing, same profile as the kiosk launcher ---
start "" "%CHROME%" --new-window --user-data-dir="%LocalAppData%\POSKiosk" "%POS_URL%"
