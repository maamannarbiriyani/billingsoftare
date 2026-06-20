"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Users, CalendarCheck, IndianRupee, Plus, Save, Clock,
  ChevronLeft, ChevronRight, X, Pencil, Trash2, AlertTriangle,
  Wallet, TrendingUp, TrendingDown, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  createEmployee, updateEmployee, deleteEmployee,
  markAttendance, getAttendancesByDate, paySalary,
} from "@/app/actions/staff";

type Employee = {
  id: number;
  name: string;
  role: string;
  dailyWage: number;
  phone: string | null;
  status: string;
  totalEarned: number;
  totalAdvanced: number;
  totalPaid: number;
  pendingBalance: number;
};

const EMPTY_FORM = { name: "", role: "Staff", phone: "", dailyWage: 0 };

export function StaffClient({ initialEmployees, userRole = "Admin" }: { initialEmployees: Employee[], userRole?: string }) {
  const [activeTab, setActiveTab] = useState<"ROSTER" | "ATTENDANCE" | "SALARY">("ROSTER");
  const [employees, setEmployees] = useState(initialEmployees);
  const [isPending, startTransition] = useTransition();

  // Add form
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);

  // Edit modal
  const [editModal, setEditModal] = useState<{ open: boolean; emp: Employee | null }>({ open: false, emp: null });
  const [editForm, setEditForm] = useState({ name: "", role: "", phone: "", dailyWage: 0, status: "ACTIVE" });

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; emp: Employee | null }>({ open: false, emp: null });

  // Attendance
  const [attDate, setAttDate] = useState(new Date());
  const [attendances, setAttendances] = useState<any[]>([]);

  // Pay salary modal
  const [payoutModal, setPayoutModal] = useState<{ open: boolean; emp: Employee | null; amount: number; month: string }>({
    open: false, emp: null, amount: 0, month: new Date().toISOString().slice(0, 7),
  });

  // Wage advance modal
  const [advanceModal, setAdvanceModal] = useState<{ open: boolean; emp: Employee | null; amount: number; reason: string }>({
    open: false, emp: null, amount: 0, reason: "",
  });

  useEffect(() => {
    if (activeTab === "ATTENDANCE") loadAttendances(attDate);
  }, [activeTab, attDate]);

  const loadAttendances = async (date: Date) => {
    const data = await getAttendancesByDate(date);
    setAttendances(data);
  };

  const handleAddEmployee = () => {
    startTransition(async () => {
      const res = await createEmployee({ ...addForm, dailyWage: Number(addForm.dailyWage) });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Employee added");
        setIsAdding(false);
        setAddForm(EMPTY_FORM);
        window.location.reload();
      }
    });
  };

  const openEdit = (emp: Employee) => {
    setEditForm({ name: emp.name, role: emp.role, phone: emp.phone || "", dailyWage: emp.dailyWage, status: emp.status });
    setEditModal({ open: true, emp });
  };

  const handleEditEmployee = () => {
    if (!editModal.emp) return;
    startTransition(async () => {
      const res = await updateEmployee(editModal.emp!.id, { ...editForm, dailyWage: Number(editForm.dailyWage) });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Employee updated");
        setEditModal({ open: false, emp: null });
        window.location.reload();
      }
    });
  };

  const handleDeleteEmployee = () => {
    if (!deleteConfirm.emp) return;
    startTransition(async () => {
      const res = await deleteEmployee(deleteConfirm.emp!.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`${deleteConfirm.emp!.name} removed`);
        setDeleteConfirm({ open: false, emp: null });
        setEmployees(prev => prev.filter(e => e.id !== deleteConfirm.emp!.id));
      }
    });
  };

  const handleMarkAtt = (emp: Employee, status: "PRESENT" | "HALF_DAY" | "ABSENT") => {
    startTransition(async () => {
      const res = await markAttendance(emp.id, attDate, status);
      if (res.error) toast.error(res.error);
      else {
        const wage =
          status === "PRESENT" ? emp.dailyWage :
          status === "HALF_DAY" ? emp.dailyWage / 2 : 0;
        if (status === "ABSENT") toast.success(`${emp.name} marked Absent`);
        else toast.success(`${emp.name} marked ${status === "PRESENT" ? "Present" : "Half Day"} · ₹${wage} added to salary`);
        loadAttendances(attDate);
      }
    });
  };

  const handlePayout = () => {
    if (!payoutModal.emp) return;
    startTransition(async () => {
      const res = await paySalary(payoutModal.emp!.id, Number(payoutModal.amount), payoutModal.month, "Salary Payment");
      if (res.error) toast.error(res.error);
      else {
        toast.success("Salary paid & expense logged");
        setPayoutModal({ ...payoutModal, open: false });
        window.location.reload();
      }
    });
  };

  const handleAdvance = () => {
    if (!advanceModal.emp || Number(advanceModal.amount) <= 0) {
      toast.error("Enter a valid advance amount");
      return;
    }
    startTransition(async () => {
      const notes = `Wage Advance${advanceModal.reason ? ": " + advanceModal.reason : ""}`;
      const res = await paySalary(advanceModal.emp!.id, Number(advanceModal.amount), new Date().toISOString().slice(0, 7), notes);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`₹${advanceModal.amount} advance recorded — will deduct from salary`);
        setAdvanceModal({ open: false, emp: null, amount: 0, reason: "" });
        window.location.reload();
      }
    });
  };

  const changeDate = (days: number) => {
    const d = new Date(attDate);
    d.setDate(d.getDate() + days);
    setAttDate(d);
  };

  const tabs = [
    { id: "ROSTER",     label: "Employee Roster",   icon: Users         },
    ...(userRole === "Admin" ? [
      { id: "ATTENDANCE", label: "Daily Attendance",   icon: CalendarCheck },
      { id: "SALARY",     label: "Salary & Payouts",   icon: IndianRupee   },
    ] : [])
  ] as const;

  return (
    <div className="animate-fade-in space-y-6 pb-8">

      {/* Header */}
      <div className="pb-6 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <h1 className="page-title">Staff Management</h1>
          </div>
          <p className="page-subtitle ml-11">Manage employees, track attendance, and process payroll</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted p-1 rounded-xl w-fit gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-h-[500px]">

        {/* ── ROSTER TAB ── */}
        {activeTab === "ROSTER" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-foreground">Active Employees <span className="text-sm font-normal text-muted-foreground ml-1">({employees.length})</span></h2>
              <button onClick={() => setIsAdding(!isAdding)} className="btn btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Employee
              </button>
            </div>

            {/* Add form */}
            {isAdding && (
              <div className="mb-6 p-4 border border-border rounded-xl bg-muted/30 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="input-label">Name *</label>
                  <input type="text" className="input-field" placeholder="Full name" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Role</label>
                  <input type="text" className="input-field" placeholder="e.g. Cashier" value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input type="text" className="input-field" placeholder="Mobile number" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Daily Wage (₹)</label>
                  <input type="number" className="input-field" placeholder="0" value={addForm.dailyWage || ""} onChange={e => setAddForm({ ...addForm, dailyWage: Number(e.target.value) })} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddEmployee} disabled={isPending || !addForm.name} className="btn btn-success flex-1">
                    <Save className="h-4 w-4" /> Save
                  </button>
                  <button onClick={() => { setIsAdding(false); setAddForm(EMPTY_FORM); }} className="btn btn-secondary px-3">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {employees.length === 0 ? (
              <div className="empty-state">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-muted-foreground">No employees yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Click "Add Employee" to get started</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th className="text-right">Daily Wage</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td className="font-semibold text-foreground">{emp.name}</td>
                      <td>
                        <span className="badge badge-default">{emp.role}</span>
                      </td>
                      <td className="text-muted-foreground">{emp.phone || "—"}</td>
                      <td className="text-right font-bold text-foreground">₹{emp.dailyWage.toFixed(2)}</td>
                      <td>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, emp })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === "ATTENDANCE" && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 bg-muted p-2 rounded-xl border border-border">
              <button onClick={() => changeDate(-1)} className="btn btn-secondary px-3">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                {attDate.toDateString()}
              </div>
              <button onClick={() => changeDate(1)} className="btn btn-secondary px-3">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th className="text-center">Mark Attendance</th>
                  <th className="text-right">Wage Added</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const att = attendances.find(a => a.employeeId === emp.id);
                  return (
                    <tr key={emp.id}>
                      <td className="font-semibold text-foreground">{emp.name}</td>
                      <td className="text-muted-foreground text-sm">{emp.role}</td>
                      <td>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleMarkAtt(emp, "PRESENT")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              att?.status === "PRESENT"
                                ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20"
                                : "bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAtt(emp, "HALF_DAY")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              att?.status === "HALF_DAY"
                                ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20"
                                : "bg-muted text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"
                            }`}
                          >
                            Half Day
                          </button>
                          <button
                            onClick={() => handleMarkAtt(emp, "ABSENT")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              att?.status === "ABSENT"
                                ? "bg-rose-500 text-white shadow-sm ring-2 ring-rose-500/20"
                                : "bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                      <td className="text-right">
                        {att && att.status !== "ABSENT" ? (
                          <span className="font-bold text-emerald-500">+ ₹{att.calculatedWage.toFixed(2)}</span>
                        ) : att?.status === "ABSENT" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not marked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SALARY TAB ── */}
        {activeTab === "SALARY" && (
          <div className="p-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: "Total Earned (All Staff)",
                  value: `₹${employees.reduce((s, e) => s + e.totalEarned, 0).toFixed(2)}`,
                  icon: TrendingUp,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                },
                {
                  label: "Total Advanced",
                  value: `₹${employees.reduce((s, e) => s + e.totalAdvanced, 0).toFixed(2)}`,
                  icon: Wallet,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                },
                {
                  label: "Pending Balance",
                  value: `₹${employees.reduce((s, e) => s + Math.max(0, e.pendingBalance), 0).toFixed(2)}`,
                  icon: TrendingDown,
                  color: "text-rose-500",
                  bg: "bg-rose-500/10",
                },
              ].map(card => (
                <div key={card.label} className="bg-muted/50 rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{card.label}</span>
                  </div>
                  <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="text-right">Earned</th>
                  <th className="text-right">Advance Given</th>
                  <th className="text-right">Total Paid</th>
                  <th className="text-right">Pending</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <p className="font-semibold text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </td>
                    <td className="text-right font-semibold text-emerald-500">₹{emp.totalEarned.toFixed(2)}</td>
                    <td className="text-right font-semibold text-amber-500">
                      {emp.totalAdvanced > 0 ? `₹${emp.totalAdvanced.toFixed(2)}` : "—"}
                    </td>
                    <td className="text-right font-semibold text-muted-foreground">₹{emp.totalPaid.toFixed(2)}</td>
                    <td className="text-right">
                      <span className={`font-bold ${emp.pendingBalance > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                        {emp.pendingBalance > 0 ? `₹${emp.pendingBalance.toFixed(2)}` : "Settled"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setAdvanceModal({ open: true, emp, amount: 0, reason: "" })}
                          className="btn btn-sm text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 flex items-center gap-1"
                          title="Give wage advance"
                        >
                          <Wallet className="h-3.5 w-3.5" /> Advance
                        </button>
                        {emp.pendingBalance > 0 && (
                          <button
                            onClick={() => setPayoutModal({ open: true, emp, amount: emp.pendingBalance, month: new Date().toISOString().slice(0, 7) })}
                            className="btn btn-sm flex items-center gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Pay Salary
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── EDIT EMPLOYEE MODAL ── */}
      {editModal.open && editModal.emp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground">Edit Employee</h3>
              <button onClick={() => setEditModal({ open: false, emp: null })} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="input-label">Full Name</label>
                <input type="text" className="input-field" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Role</label>
                <input type="text" className="input-field" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input type="text" className="input-field" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Daily Wage (₹)</label>
                <input type="number" className="input-field" value={editForm.dailyWage || ""} onChange={e => setEditForm({ ...editForm, dailyWage: Number(e.target.value) })} />
              </div>
              <div>
                <label className="input-label">Status</label>
                <select className="input-field" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button onClick={() => setEditModal({ open: false, emp: null })} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleEditEmployee} disabled={isPending || !editForm.name} className="btn btn-primary flex-1">
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm.open && deleteConfirm.emp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">Remove Employee?</h3>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">{deleteConfirm.emp.name}</span> will be deactivated.
              </p>
              <p className="text-xs text-muted-foreground mb-6">Their attendance and salary history will be preserved.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm({ open: false, emp: null })} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleDeleteEmployee} disabled={isPending} className="btn btn-danger flex-1">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAY SALARY MODAL ── */}
      {payoutModal.open && payoutModal.emp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground">Pay Salary</h3>
              <button onClick={() => setPayoutModal({ ...payoutModal, open: false })} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/50 rounded-xl p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-0.5">Employee</p>
                <p className="font-bold text-foreground">{payoutModal.emp.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total Earned</p>
                  <p className="font-bold text-emerald-500">₹{payoutModal.emp.totalEarned.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Already Paid</p>
                  <p className="font-bold text-muted-foreground">₹{payoutModal.emp.totalPaid.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <label className="input-label">Amount to Pay (₹)</label>
                <input type="number" className="input-field" value={payoutModal.amount || ""} onChange={e => setPayoutModal({ ...payoutModal, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="input-label">Month</label>
                <input type="month" className="input-field" value={payoutModal.month} onChange={e => setPayoutModal({ ...payoutModal, month: e.target.value })} />
              </div>
              <button disabled={isPending || payoutModal.amount <= 0} onClick={handlePayout} className="btn btn-success w-full">
                <CreditCard className="h-4 w-4" /> Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WAGE ADVANCE MODAL ── */}
      {advanceModal.open && advanceModal.emp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-foreground">Wage Advance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Will be deducted from monthly salary</p>
              </div>
              <button onClick={() => setAdvanceModal({ open: false, emp: null, amount: 0, reason: "" })} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Advance for <span className="font-bold">{advanceModal.emp.name}</span>
                  {advanceModal.emp.pendingBalance > 0 && (
                    <> · Pending: <span className="font-bold">₹{advanceModal.emp.pendingBalance.toFixed(2)}</span></>
                  )}
                </p>
              </div>
              <div>
                <label className="input-label">Advance Amount (₹)</label>
                <input
                  type="number"
                  autoFocus
                  className="input-field"
                  placeholder="Enter amount"
                  value={advanceModal.amount || ""}
                  onChange={e => setAdvanceModal({ ...advanceModal, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="input-label">Reason (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Medical emergency"
                  value={advanceModal.reason}
                  onChange={e => setAdvanceModal({ ...advanceModal, reason: e.target.value })}
                />
              </div>
              <button disabled={isPending || advanceModal.amount <= 0} onClick={handleAdvance} className="btn w-full font-bold text-amber-600 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25">
                <Wallet className="h-4 w-4" /> Record Advance — ₹{advanceModal.amount || "0"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
