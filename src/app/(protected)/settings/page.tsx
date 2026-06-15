import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";
import { requireAdmin } from "@/lib/auth";
import { Settings, Store, Printer, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  await requireAdmin();
  const setting = await prisma.setting.findFirst();

  return (
    <div className="animate-fade-in max-w-3xl pb-8">
      {/* Page Header */}
      <div className="pb-6 border-b border-border/50 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <h1 className="page-title">Settings</h1>
        </div>
        <p className="page-subtitle ml-11">Manage your store configuration and preferences</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store</p>
            <p className="text-sm font-bold text-foreground truncate">{setting?.storeName || "Not set"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GST No.</p>
            <p className="text-sm font-bold text-foreground truncate">{setting?.gstNumber || "Not set"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Printer</p>
            <p className="text-sm font-bold text-foreground truncate">{setting?.printerName || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="section-title">Store Configuration</h2>
          <p className="section-subtitle">Update your store information and receipt settings</p>
        </div>
        <div className="p-6">
          <SettingsClient initialSetting={setting} />
        </div>
      </div>
    </div>
  );
}
