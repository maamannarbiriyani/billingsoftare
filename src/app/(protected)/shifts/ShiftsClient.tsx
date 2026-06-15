"use client";

import { useState, useTransition } from "react";
import { openShift, closeShift } from "@/app/actions/shifts";
import { toast } from "sonner";
import { Clock, CheckCircle2, Lock, Banknote, Calendar } from "lucide-react";
import { format } from "date-fns";

type ShiftsClientProps = {
  activeShift: any;
  recentShifts: any[];
};

export function ShiftsClient({ activeShift, recentShifts }: ShiftsClientProps) {
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenShift = () => {
    if (!openingBalance) return toast.error("Enter opening balance");
    startTransition(async () => {
      const res = await openShift(Number(openingBalance));
      if (res.error) toast.error(res.error);
      else {
        toast.success("Shift opened successfully");
        setOpeningBalance("");
      }
    });
  };

  const handleCloseShift = () => {
    if (!closingBalance) return toast.error("Enter closing balance");
    startTransition(async () => {
      const res = await closeShift(activeShift.id, Number(closingBalance));
      if (res.error) toast.error(res.error);
      else {
        toast.success("Shift closed successfully");
        setClosingBalance("");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Shift Management</h1>
          <p className="page-subtitle">Open and close cashier registers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Shift Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center justify-center text-center h-72">
          {activeShift ? (
            <div className="space-y-4 w-full">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-2">
                <Clock className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Shift is OPEN</h2>
              <p className="text-muted-foreground text-sm">
                Opened at {format(new Date(activeShift.openedAt), "MMM d, yyyy h:mm a")}
              </p>
              <div className="pt-4 max-w-xs mx-auto space-y-3">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="Counted Cash in Drawer (₹)"
                  className="input-field text-center"
                />
                <button
                  onClick={handleCloseShift}
                  disabled={isPending}
                  className="btn bg-rose-600 hover:bg-rose-700 text-white w-full flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {isPending ? "Closing..." : "Close Shift"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-2">
                <Banknote className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Register is CLOSED</h2>
              <p className="text-muted-foreground text-sm">Open a new shift to start billing.</p>
              <div className="pt-4 max-w-xs mx-auto space-y-3">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="Opening Cash Balance (₹)"
                  className="input-field text-center"
                />
                <button
                  onClick={handleOpenShift}
                  disabled={isPending}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isPending ? "Opening..." : "Open Shift"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col justify-center">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-400" />
            Why use Shifts?
          </h3>
          <ul className="space-y-3 text-muted-foreground/50 text-sm">
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              Track exact cash handled by cashiers during their work hours.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              Calculates cash sales automatically to reconcile with the drawer.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              Prevents unauthorized billing when the register is closed.
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border/50 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-indigo-500" />
          <h2 className="font-bold text-foreground">Recent Shifts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Opened At</th>
                <th className="px-6 py-4 font-semibold">Closed At</th>
                <th className="px-6 py-4 font-semibold text-right">Opening Balance</th>
                <th className="px-6 py-4 font-semibold text-right">Cash Sales</th>
                <th className="px-6 py-4 font-semibold text-right">Closing Balance</th>
                <th className="px-6 py-4 font-semibold text-right">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentShifts.map((shift) => {
                const expectedCash = shift.openingBalance + shift.cashSales;
                const difference = shift.closingBalance !== null ? shift.closingBalance - expectedCash : 0;
                
                return (
                  <tr key={shift.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${shift.status === "OPEN" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400" : "bg-muted/50 text-foreground"}`}>
                        {shift.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(shift.openedAt), "MMM d, h:mm a")}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {shift.closedAt ? format(new Date(shift.closedAt), "MMM d, h:mm a") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-foreground/90">
                      ₹{shift.openingBalance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      ₹{shift.cashSales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">
                      {shift.closingBalance !== null ? `₹${shift.closingBalance.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {shift.closingBalance !== null ? (
                        <span className={`font-bold ${difference > 0 ? "text-emerald-600" : difference < 0 ? "text-rose-600" : "text-muted-foreground/80"}`}>
                          {difference > 0 ? "+" : ""}{difference.toFixed(2)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
              {recentShifts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No shifts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
