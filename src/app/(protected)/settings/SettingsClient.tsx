"use client";

import { useState, useRef } from "react";
import { Download, Upload, AlertCircle, Save, Store, GitBranch, BarChart3, Check, X } from "lucide-react";
import { upsertOwnerAccount } from "@/app/actions/owner-account";
import { useRouter } from "next/navigation";
import { ShopSettingsForm } from "@/components/ShopSettingsForm";
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
    <>
      {/* Shop Settings */}
      <section className="bg-card  shadow rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border  bg-muted  flex items-center gap-2">
          <Store className="h-5 w-5 text-muted-foreground " />
          <div>
            <h2 className="text-lg font-medium text-foreground ">Shop Details</h2>
            <p className="text-sm text-muted-foreground  mt-1">
              Update your store's information. This data will be printed on all
              generated invoices.
            </p>
          </div>
        </div>
        <div className="p-6">
          <ShopSettingsForm initialData={initialSetting} />
        </div>
      </section>

      {/* Backup & Restore Section */}
      <section className="bg-card  shadow rounded-xl overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-border  bg-muted ">
          <h2 className="text-lg font-medium text-foreground ">
            Database Backup & Restore
          </h2>
          <p className="text-sm text-muted-foreground  mt-1">
            Download a copy of your entire database for safekeeping, or upload a
            backup to restore your data.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup */}
          <div className="border border-border  rounded-lg p-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-indigo-100  text-indigo-600  rounded-full flex items-center justify-center mb-4">
              <Download className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground  mb-2">
              Backup Data
            </h3>
            <p className="text-sm text-muted-foreground  mb-4 flex-1">
              Download your complete database file (.sqlite). Keep this file
              safe on a USB drive or cloud storage.
            </p>
            <button
              onClick={handleBackup}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Download className="h-4 w-4" /> Download Backup
            </button>
          </div>

          {/* Restore */}
          <div className="border border-border  rounded-lg p-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-red-100  text-red-600  rounded-full flex items-center justify-center mb-4">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground  mb-2">
              Restore Data
            </h3>
            <p className="text-sm text-muted-foreground  mb-4 flex-1">
              Upload a previous backup file to restore your system.{" "}
              <strong className="text-red-600 ">
                Warning: Overwrites current data.
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
              className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-card  px-4 py-2 text-sm font-medium text-red-600  border border-red-200  shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {isRestoring ? "Restoring..." : "Upload & Restore"}
            </button>
          </div>
        </div>

        {restoreMessage && (
          <div
            className={`p-4 border-t ${restoreMessage.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{restoreMessage.text}</p>
            </div>
          </div>
        )}
      </section>

      {/* User Management Section */}
      <section className="bg-card  shadow rounded-xl overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-border  bg-muted flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground ">User Management (RBAC)</h2>
            <p className="text-sm text-muted-foreground  mt-1">
              Add or remove staff accounts and manage permissions (Admin vs Cashier).
            </p>
          </div>
          <button
            onClick={() => router.push('/settings/users')}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Manage Users
          </button>
        </div>
      </section>

      {/* Branch Management Section */}
      <section className="bg-card shadow rounded-xl overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-border bg-muted flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground">Branch Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage store branches (locations, phone numbers, addresses).
            </p>
          </div>
          <button
            onClick={() => router.push('/settings/branches')}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <GitBranch className="h-4 w-4" /> Manage Branches
          </button>
        </div>
      </section>

      {/* Owner Portal Section */}
      <section className="bg-card shadow rounded-xl overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-border bg-muted flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          <div>
            <h2 className="text-lg font-medium text-foreground">Owner Portal Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set the username and password the business owner uses to log in at <strong>/owner</strong>.
            </p>
          </div>
        </div>
        <div className="p-6">
          {ownerMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border mb-4 ${ownerMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {ownerMsg.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {ownerMsg.text}
            </div>
          )}
          <form action={handleOwnerAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label text-sm font-medium text-foreground block mb-1.5">Username</label>
              <input
                type="text"
                name="username"
                required
                placeholder="e.g. owner"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="input-label text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="Min 6 characters"
                className="input-field w-full"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={ownerPending}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
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
    </>
  );
}
