import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import { OwnerSettingsClient } from "./OwnerSettingsClient";
import { Settings, Store, Phone, MapPin, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const session = await requireOwner();
  const [setting, branches] = await Promise.all([
    prisma.setting.findFirst(),
    prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Settings className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <p className="text-xs text-slate-500">Store information and portal preferences</p>
        </div>
      </div>

      {/* Store info (read-only view) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide text-slate-400">Store Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={Store} label="Store Name" value={setting?.storeName || "—"} />
          <InfoRow icon={Phone} label="Phone" value={setting?.phone || "—"} />
          <InfoRow icon={ShieldCheck} label="GST Number" value={setting?.gstNumber || "—"} />
          <InfoRow icon={MapPin} label="Address" value={setting?.address || "—"} />
        </div>
      </div>

      {/* Branches (read-only) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">Branches ({branches.length})</h2>
        {branches.length === 0 ? (
          <p className="text-sm text-slate-400">No branches configured. Contact your system admin.</p>
        ) : (
          <div className="space-y-3">
            {branches.map(b => (
              <div key={b.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">{b.name[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{b.name}</p>
                  {b.phone && <p className="text-xs text-slate-400">{b.phone}</p>}
                  {b.address && <p className="text-xs text-slate-400">{b.address}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <OwnerSettingsClient username={session.username} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
