import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import { Users, Phone, UserCheck, UserX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerStaffPage() {
  await requireOwner();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [employees, attendanceThisMonth, payoutsThisMonth] = await Promise.all([
    prisma.employee.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] }),
    prisma.attendance.findMany({
      where: { date: { gte: startOfMonth } },
      select: { employeeId: true, status: true },
    }),
    prisma.salaryPayout.findMany({
      where: { month: monthStr },
      select: { employeeId: true, amount: true },
    }),
  ]);

  // Build attendance summary per employee
  const attMap: Record<number, { present: number; halfDay: number; absent: number }> = {};
  attendanceThisMonth.forEach(a => {
    if (!attMap[a.employeeId]) attMap[a.employeeId] = { present: 0, halfDay: 0, absent: 0 };
    if (a.status === "PRESENT") attMap[a.employeeId].present++;
    else if (a.status === "HALF_DAY") attMap[a.employeeId].halfDay++;
    else attMap[a.employeeId].absent++;
  });

  const payoutMap: Record<number, number> = {};
  payoutsThisMonth.forEach(p => {
    payoutMap[p.employeeId] = (payoutMap[p.employeeId] || 0) + p.amount;
  });

  const active = employees.filter(e => e.status === "ACTIVE");
  const inactive = employees.filter(e => e.status !== "ACTIVE");
  const totalPayouts = payoutsThisMonth.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Users className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff</h1>
          <p className="text-xs text-slate-500">{active.length} active · {inactive.length} inactive</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{employees.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{active.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Paid This Month</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">₹{totalPayouts.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Staff cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">Active Staff ({active.length})</p>
        </div>
        {active.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No active staff</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {active.map(emp => {
              const att = attMap[emp.id] || { present: 0, halfDay: 0, absent: 0 };
              const paid = payoutMap[emp.id] || 0;
              return (
                <div key={emp.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-700">{emp.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{emp.role}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {emp.phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Phone className="h-2.5 w-2.5" />{emp.phone}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        ₹{emp.dailyWage}/day
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex gap-1 text-xs">
                      <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium" title="Present">{att.present}P</span>
                      {att.halfDay > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">{att.halfDay}H</span>}
                    </div>
                    {paid > 0 && <p className="text-xs text-slate-500 mt-0.5">Paid ₹{paid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inactive.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-500">Inactive Staff ({inactive.length})</p>
          </div>
          <div className="divide-y divide-slate-50">
            {inactive.map(emp => (
              <div key={emp.id} className="px-5 py-3.5 flex items-center gap-3 opacity-60">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserX className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600">{emp.name}</p>
                <span className="text-xs text-slate-400 ml-auto">{emp.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
