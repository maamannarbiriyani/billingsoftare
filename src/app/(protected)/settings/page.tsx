import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";
import { requireAdmin } from "@/lib/auth";
import { Settings, Store, Printer, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  await requireAdmin();
  const setting = await prisma.setting.findFirst();

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12 pt-4">
      {/* Page Header */}
      <div className="flex flex-col items-center justify-center text-center pb-8 mb-8 border-b border-border/50">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm border border-primary/20">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings & Configuration</h1>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Manage your store configuration, user permissions, branches, and system preferences.
        </p>
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

      {/* Settings Sections */}
      <SettingsClient initialSetting={setting} />
    </div>
  );
}
