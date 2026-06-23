@echo off
REM ============================================================
REM   POS — Silent Thermal Printing Launcher
REM ------------------------------------------------------------
REM   Launches Chrome in "kiosk printing" mode so that bills and
REM   KOTs print DIRECTLY to the default printer with NO dialog
REM   and NO "Save as PDF" prompt.
REM
REM   SETUP (one time):
REM   1. Set your 80mm thermal printer as the Windows DEFAULT
REM      printer:  Settings > Bluetooth & devices > Printers.
REM      (Turn OFF "Let Windows manage my default printer".)
REM   2. Edit the POS_URL line below to your real site address.
REM   3. Double-click this file to open the POS and print silently.
REM ============================================================

SET "POS_URL=https://your-site.vercel.app/billing"

REM --- Find Chrome ---
SET "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
IF NOT EXIST "%CHROME%" SET "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
IF NOT EXIST "%CHROME%" SET "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

IF NOT EXIST "%CHROME%" (
  echo Google Chrome was not found. Please install Chrome.
  pause
  exit /b 1
)

REM --- Launch in kiosk-printing mode ---
start "" "%CHROME%" --kiosk-printing --new-window --user-data-dir="%LocalAppData%\POSKiosk" "%POS_URL%"
