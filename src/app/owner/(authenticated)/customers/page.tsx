import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import { UserCircle, Phone, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const filter = params.filter || "all";

  const where: any = {};
  if (filter === "khata") where.balance = { gt: 0 };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { balance: "desc" },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  const totalKhata = customers.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
  const khataCount = customers.filter(c => c.balance > 0).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <UserCircle className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500">{customers.length} customers · ₹{totalKhata.toLocaleString("en-IN", { maximumFractionDigits: 0 })} outstanding</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{customers.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">With Khata</p>
          <p className="text-2xl font-bold text-amber-600 mt-0.5">{khataCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Outstanding</p>
          <p className="text-2xl font-bold text-red-600 mt-0.5">₹{totalKhata.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {khataCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{khataCount} customers owe a total of ₹{totalKhata.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-amber-600 mt-0.5">Remind staff to collect pending payments</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5">
        {[
          { label: "All Customers", value: "all" },
          { label: "Khata (Due)", value: "khata" },
        ].map(f => (
          <a
            key={f.value}
            href={`/owner/customers?filter=${f.value}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.value ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Customer list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No customers found</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {customers.map(c => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-slate-600">{c.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.phone && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />{c.phone}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{c._count.invoices} bills</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {c.balance > 0 ? (
                    <span className="text-sm font-bold text-red-600">₹{c.balance.toFixed(2)}</span>
                  ) : c.balance < 0 ? (
                    <span className="text-sm font-bold text-emerald-600">+₹{Math.abs(c.balance).toFixed(2)}</span>
                  ) : (
                    <span className="text-xs text-slate-300">No due</span>
                  )}
                  {c.balance !== 0 && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{c.balance > 0 ? "owes" : "credit"}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
