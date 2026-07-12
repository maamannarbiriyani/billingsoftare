"use client";

import { useState, useRef } from "react";
import { Download, Upload, AlertCircle, Save, Store, GitBranch, BarChart3, Check, X } from "lucide-react";
import { upsertOwnerAccount } from "@/app/actions/owner-account";
import { useRouter } from "next/navigation";
import { ShopSettingsForm } from "@/components/ShopSettingsForm";
import { QzPrinterSettings } from "@/components/QzPrinterSettings";
import { RawBtPrinterSettings } from "@/components/RawBtPrinterSettings";
import { ConfirmModal } from "@/components/ConfirmModal";

type SettingsClientProps = {
  initialSetting: any;
};

export function SettingsClient({ initialSetting }: SettingsClientProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [ownerMsg, setOwnerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [ownerPending, setOwnerPending] = useState(false);
  
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleOwnerAccount(formData: FormData) {
    setOwnerPending(true);
    setOwnerMsg(null);
    const result = await upsertOwnerAccount(formData);
    if (result.error) setOwnerMsg({ type: "error", text: result.error });
    else setOwnerMsg({ type: "success", text: "Owner portal account saved!" });
    setOwnerPending(false);
  }

  const handleBackup = () => {
    window.location.href = "/api/backup";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToRestore(file);
  };

  const confirmRestore = async () => {
    if (!fileToRestore) return;
    setIsRestoring(true);
    setRestoreMessage(null);

    const formData = new FormData();
    formData.append("db", fileToRestore);

    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setRestoreMessage({
          type: "success",
          text: "Database restored successfully! Please restart the server for changes to fully apply.",
        });
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setRestoreMessage({
          type: "error",
          text: data.error || "Failed to restore database.",
        });
      }
    } catch (err) {
      setRestoreMessage({
        type: "error",
        text: "An unexpected error occurred during restore.",
      });
    } finally {
      setIsRestoring(false);
      setFileToRestore(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const cancelRestore = () => {
    setFileToRestore(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Shop Settings */}
      <section className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="section-title">Shop Details</h2>
            <p className="section-subtitle">
              Update your store&apos;s information. This data is printed on all generated invoices.
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <ShopSettingsForm initialData={initialSetting} />
        </div>
      </section>

      {/* Thermal Printer (QZ Tray) */}
      <QzPrinterSettings />

      {/* Thermal Printer (RawBT / Android) */}
      <RawBtPrinterSettings />

      {/* Backup & Restore Section */}
      <section className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="section-title">Database Backup &amp; Restore</h2>
            <p className="section-subtitle">
              Download a copy of your entire database for safekeeping, or restore from a backup.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Backup */}
          <div className="card-flat p-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
              <Download className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Backup Data</h3>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Download your complete database file. Keep it safe on a USB drive or cloud storage.
            </p>
            <button onClick={handleBackup} className="btn btn-primary w-full">
              <Download className="h-4 w-4" /> Download Backup
            </button>
          </div>

          {/* Restore */}
          <div className="card-flat p-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-4">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Restore Data</h3>
            <p className="text-sm text-muted-foreground mb-5 flex-1">
              Upload a previous backup file to restore your system.{" "}
              <strong className="text-red-600 dark:text-red-400">
                Warning: overwrites current data.
              </strong>
            </p>

            <input
              type="file"
              accept=".sqlite,.db"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="btn btn-danger w-full"
            >
              <Upload className="h-4 w-4" />
              {isRestoring ? "Restoring..." : "Upload & Restore"}
            </button>
          </div>
        </div>

        {restoreMessage && (
          <div
            className={`flex items-center gap-2 px-4 sm:px-6 py-4 border-t text-sm font-medium ${
              restoreMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{restoreMessage.text}</p>
          </div>
        )}
      </section>

      {/* User Management Section */}
      <section className="card">
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="section-title">User Management (RBAC)</h2>
            <p className="section-subtitle">
              Add or remove staff accounts and manage permissions (Admin vs Cashier).
            </p>
          </div>
          <button onClick={() => router.push('/settings/users')} className="btn btn-secondary flex-shrink-0 w-full sm:w-auto">
            Manage Users
          </button>
        </div>
      </section>

      {/* Branch Management Section */}
      <section className="card">
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Branch Management</h2>
            <p className="section-subtitle">
              Add and manage store branches (locations, phone numbers, addresses).
            </p>
          </div>
          <button onClick={() => router.push('/settings/branches')} className="btn btn-secondary flex-shrink-0 w-full sm:w-auto">
            <GitBranch className="h-4 w-4" /> Manage Branches
          </button>
        </div>
      </section>

      {/* Owner Portal Section */}
      <section className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="section-title">Owner Portal Access</h2>
            <p className="section-subtitle">
              Set the username and password the business owner uses to log in at <strong>/owner</strong>.
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {ownerMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border mb-4 ${ownerMsg.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"}`}>
              {ownerMsg.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {ownerMsg.text}
            </div>
          )}
          <form action={handleOwnerAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                required
                placeholder="e.g. owner"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="Min 6 characters"
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={ownerPending} className="btn btn-primary w-full sm:w-auto">
                {ownerPending ? "Saving..." : "Save Owner Account"}
              </button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            The owner can access the portal at <strong>yoursite.com/owner</strong> and change their password after logging in.
          </p>
        </div>
      </section>

      <ConfirmModal
        isOpen={fileToRestore !== null}
        title="Restore Database"
        message="WARNING: Restoring a database will overwrite ALL current data (products, invoices, users). Are you absolutely sure you want to proceed?"
        confirmText="Restore Data"
        onConfirm={confirmRestore}
        onCancel={cancelRestore}
        isLoading={isRestoring}
      />
    </div>
  );
}
