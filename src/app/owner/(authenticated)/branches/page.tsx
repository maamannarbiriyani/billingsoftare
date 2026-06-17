import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import { GitBranch, Phone, MapPin, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerBranchesPage() {
  await requireOwner();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [branches, monthlyStats] = await Promise.all([
    prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      _count: true,
      where: { createdAt: { gte: startOfMonth } },
    }),
  ]);

  const monthRevenue = monthlyStats._sum.total || 0;
  const monthBills = monthlyStats._count;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <GitBranch className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Branches</h1>
          <p className="text-xs text-slate-500">All store locations</p>
        </div>
      </div>

      {/* This month overall */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">This Month Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">
            ₹{monthRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">This Month Bills</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{monthBills}</p>
        </div>
      </div>

      {/* Branch cards */}
      {branches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No branches configured yet</p>
          <p className="text-xs text-slate-400 mt-1">Ask your system admin to add branches in POS Settings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{branch.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                    {branch.isMain && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        Main
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {branch.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {branch.phone}
                      </div>
                    )}
                    {branch.address && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{branch.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Branch-wise revenue tracking coming in the next update
      </p>
    </div>
  );
}
