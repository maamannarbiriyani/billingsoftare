"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, CalendarCheck, IndianRupee, Plus, Save,
  X, Pencil, Trash2, AlertTriangle,
  Wallet, TrendingUp, TrendingDown, CreditCard,
  Briefcase, Phone, BadgeCheck
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
        toast.success("Employee added successfully");
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
        toast.success(`₹${advanceModal.amount} advance recorded`);
        setAdvanceModal({ open: false, emp: null, amount: 0, reason: "" });
        window.location.reload();
      }
    });
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const tabs = [
    { id: "ROSTER",     label: "Roster",      icon: Users         },
    ...(userRole === "Admin" ? [
      { id: "ATTENDANCE", label: "Attendance",  icon: CalendarCheck },
      { id: "SALARY",     label: "Payroll",     icon: IndianRupee   },
    ] : [])
  ] as const;

  const totalEarnedAll = employees.reduce((s, e) => s + e.totalEarned, 0);
  const totalPendingAll = employees.reduce((s, e) => s + Math.max(0, e.pendingBalance), 0);

  return (
    <div className="animate-fade-in space-y-8 pb-12 max-w-6xl mx-auto">

      {/* Global Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Staff HQ</h1>
          </div>
          <p className="text-muted-foreground ml-13">Manage your team, track daily attendance, and process payouts securely.</p>
        </div>

        {userRole === "Admin" && (
          <div className="flex gap-4">
            <div className="glass px-5 py-3 rounded-2xl flex flex-col items-end shadow-sm border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Team</span>
              <span className="text-xl font-black text-foreground flex items-center gap-2">
                {employees.length} <Users className="h-4 w-4 text-primary" />
              </span>
            </div>
            <div className="glass px-5 py-3 rounded-2xl flex flex-col items-end shadow-sm border-l-4 border-l-rose-500 border-y border-r border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending Pay</span>
              <span className="text-xl font-black text-rose-500 flex items-center gap-2">
                ₹{totalPendingAll.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Animated Tabs */}
      <div className="flex p-1.5 bg-muted/50 backdrop-blur-md border border-border rounded-2xl w-fit gap-1 shadow-inner relative">
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors z-10 ${
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStaffTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <t.icon className={`h-4 w-4 relative z-20 ${isActive ? "text-primary-foreground" : ""}`} />
              <span className="relative z-20">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-3xl border border-border shadow-xl shadow-black/5 overflow-hidden min-h-[500px] relative">
        <AnimatePresence mode="wait">
          
          {/* ── ROSTER TAB ── */}
          {activeTab === "ROSTER" && (
            <motion.div
              key="roster"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground">Employee Roster</h2>
                  <p className="text-sm text-muted-foreground mt-1">View and manage all active staff members.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="btn btn-primary rounded-xl px-5 shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4" /> Add Employee
                </button>
              </div>

              {employees.length === 0 ? (
                <div className="empty-state py-16">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No employees found</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">You haven't added any staff members yet. Click the button above to start building your team.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employees.map(emp => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={emp.id}
                      className="group p-5 rounded-2xl border border-border bg-card-flat hover:border-primary/30 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 text-primary font-black text-lg shadow-inner">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-lg">{emp.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="badge badge-purple px-2 py-0.5"><Briefcase className="w-3 h-3 mr-1 inline"/>{emp.role}</span>
                              {emp.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3"/> {emp.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(emp)} className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm({ open: true, emp })} className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Daily Wage:</span>
                          <span className="ml-2 font-bold text-emerald-500">₹{emp.dailyWage.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                          <BadgeCheck className="w-3.5 h-3.5" /> Active
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── ATTENDANCE TAB ── */}
          {activeTab === "ATTENDANCE" && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <CalendarCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Daily Attendance</h2>
                    <p className="text-sm text-muted-foreground">Select date to mark staff presence</p>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="date"
                    className="input-field font-semibold text-primary bg-card shadow-sm pl-10 cursor-pointer w-full sm:w-auto"
                    value={formatDateForInput(attDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-');
                        setAttDate(new Date(Number(y), Number(m) - 1, Number(d)));
                      }
                    }}
                  />
                  <CalendarCheck className="h-4 w-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {employees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No employees to mark attendance for.</div>
              ) : (
                <div className="space-y-3">
                  {employees.map(emp => {
                    const att = attendances.find(a => a.employeeId === emp.id);
                    return (
                      <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card-flat hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{emp.name}</h4>
                            <p className="text-xs text-muted-foreground">{emp.role}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex bg-muted p-1 rounded-xl">
                            <button
                              onClick={() => handleMarkAtt(emp, "PRESENT")}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                att?.status === "PRESENT"
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                  : "text-muted-foreground hover:text-emerald-500"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAtt(emp, "HALF_DAY")}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                att?.status === "HALF_DAY"
                                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                  : "text-muted-foreground hover:text-amber-500"
                              }`}
                            >
                              Half Day
                            </button>
                            <button
                              onClick={() => handleMarkAtt(emp, "ABSENT")}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                att?.status === "ABSENT"
                                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                                  : "text-muted-foreground hover:text-rose-500"
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                          
                          <div className="w-24 text-right">
                            {att && att.status !== "ABSENT" ? (
                              <span className="font-bold text-emerald-500">+ ₹{att.calculatedWage.toFixed(2)}</span>
                            ) : att?.status === "ABSENT" ? (
                              <span className="text-rose-500 font-bold text-sm">—</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── SALARY TAB ── */}
          {activeTab === "SALARY" && (
            <motion.div
              key="salary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { label: "Total Earned", value: totalEarnedAll, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Total Paid & Adv", value: employees.reduce((s, e) => s + e.totalPaid + e.totalAdvanced, 0), icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { label: "Total Pending", value: totalPendingAll, icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10" },
                ].map((stat, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-border bg-card-flat flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color}`}>₹{stat.value.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="bg-muted/50 py-4 px-6 text-xs tracking-wider">Employee</th>
                      <th className="bg-muted/50 py-4 px-6 text-right text-xs tracking-wider">Total Earned</th>
                      <th className="bg-muted/50 py-4 px-6 text-right text-xs tracking-wider">Total Paid</th>
                      <th className="bg-muted/50 py-4 px-6 text-right text-xs tracking-wider">Pending Pay</th>
                      <th className="bg-muted/50 py-4 px-6 text-center text-xs tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-foreground">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.role}</div>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-500">₹{emp.totalEarned.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-semibold text-muted-foreground">₹{emp.totalPaid.toFixed(2)}</td>
                        <td className="py-4 px-6 text-right">
                          {emp.pendingBalance > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 font-bold text-sm">
                              ₹{emp.pendingBalance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold text-sm flex items-center justify-end gap-1"><BadgeCheck className="w-4 h-4"/> Settled</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setAdvanceModal({ open: true, emp, amount: 0, reason: "" })}
                              className="btn btn-sm text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                            >
                              <Wallet className="h-3.5 w-3.5" /> Advance
                            </button>
                            {emp.pendingBalance > 0 && (
                              <button
                                onClick={() => setPayoutModal({ open: true, emp, amount: emp.pendingBalance, month: new Date().toISOString().slice(0, 7) })}
                                className="btn btn-sm btn-primary shadow-md shadow-primary/20"
                              >
                                <CreditCard className="h-3.5 w-3.5" /> Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── MODALS (AnimatePresence) ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-black text-xl text-foreground flex items-center gap-2"><Plus className="w-5 h-5 text-primary"/> New Employee</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="input-label">Full Name *</label>
                    <input type="text" autoFocus className="input-field" placeholder="e.g. Rahul Kumar" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">Role</label>
                    <input type="text" className="input-field" placeholder="e.g. Sales" value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">Phone</label>
                    <input type="text" className="input-field" placeholder="+91..." value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="input-label">Daily Wage (₹) *</label>
                    <input type="number" className="input-field text-lg font-bold text-primary" placeholder="0.00" value={addForm.dailyWage || ""} onChange={e => setAddForm({ ...addForm, dailyWage: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsAdding(false)} className="btn btn-secondary flex-1 py-3 text-base">Cancel</button>
                  <button onClick={handleAddEmployee} disabled={isPending || !addForm.name || addForm.dailyWage <= 0} className="btn btn-primary flex-1 py-3 text-base shadow-lg shadow-primary/30">
                    <Save className="h-5 w-5" /> Save Employee
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editModal.open && editModal.emp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-black text-xl text-foreground flex items-center gap-2"><Pencil className="w-5 h-5 text-primary"/> Edit Details</h3>
                <button onClick={() => setEditModal({ open: false, emp: null })} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-8 grid grid-cols-2 gap-5">
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
                <div className="col-span-2 flex gap-3 pt-4">
                  <button onClick={() => setEditModal({ open: false, emp: null })} className="btn btn-secondary flex-1 py-3 text-base">Cancel</button>
                  <button onClick={handleEditEmployee} disabled={isPending || !editForm.name} className="btn btn-primary flex-1 py-3 text-base shadow-lg shadow-primary/30">
                    <Save className="h-5 w-5" /> Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deleteConfirm.open && deleteConfirm.emp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center relative"
            >
              <button onClick={() => setDeleteConfirm({ open: false, emp: null })} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="font-black text-xl text-foreground mb-2">Remove Employee?</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to deactivate <span className="font-bold text-foreground">{deleteConfirm.emp.name}</span>? Their past records will be preserved.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm({ open: false, emp: null })} className="btn btn-secondary flex-1 py-3">Cancel</button>
                <button onClick={handleDeleteEmployee} disabled={isPending} className="btn btn-danger flex-1 py-3 shadow-lg shadow-rose-500/20">
                  <Trash2 className="h-5 w-5" /> Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {payoutModal.open && payoutModal.emp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-black text-xl text-foreground flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/> Pay Salary</h3>
                <button onClick={() => setPayoutModal({ ...payoutModal, open: false })} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Paying To</p>
                  <p className="font-black text-lg text-foreground">{payoutModal.emp.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-xl border border-border">
                    <p className="text-muted-foreground text-xs font-semibold mb-1">Total Earned</p>
                    <p className="font-black text-emerald-500">₹{payoutModal.emp.totalEarned.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border">
                    <p className="text-muted-foreground text-xs font-semibold mb-1">Pending Pay</p>
                    <p className="font-black text-rose-500">₹{payoutModal.emp.pendingBalance.toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="input-label">Payment Amount (₹)</label>
                    <input type="number" className="input-field text-xl font-black text-primary" autoFocus value={payoutModal.amount || ""} onChange={e => setPayoutModal({ ...payoutModal, amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="input-label">Salary Month</label>
                    <input type="month" className="input-field" value={payoutModal.month} onChange={e => setPayoutModal({ ...payoutModal, month: e.target.value })} />
                  </div>
                  <button disabled={isPending || payoutModal.amount <= 0 || payoutModal.amount > payoutModal.emp.pendingBalance} onClick={handlePayout} className="btn btn-primary w-full py-3.5 text-base shadow-lg shadow-primary/30 mt-2">
                    <CreditCard className="h-5 w-5" /> Confirm Payout
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {advanceModal.open && advanceModal.emp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-amber-500/10">
                <div>
                  <h3 className="font-black text-xl text-amber-600 dark:text-amber-500 flex items-center gap-2"><Wallet className="w-5 h-5"/> Wage Advance</h3>
                  <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-1 font-semibold">Deducted from future salary</p>
                </div>
                <button onClick={() => setAdvanceModal({ open: false, emp: null, amount: 0, reason: "" })} className="p-2 hover:bg-amber-500/20 rounded-full transition-colors">
                  <X className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                </button>
              </div>
              <div className="p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-600 dark:text-amber-500">
                    {getInitials(advanceModal.emp.name)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{advanceModal.emp.name}</p>
                    <p className="text-xs text-muted-foreground">{advanceModal.emp.role}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="input-label">Advance Amount (₹)</label>
                    <input
                      type="number"
                      autoFocus
                      className="input-field text-xl font-black focus:border-amber-500 focus:ring-amber-500"
                      placeholder="0.00"
                      value={advanceModal.amount || ""}
                      onChange={e => setAdvanceModal({ ...advanceModal, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="input-label">Reason (optional)</label>
                    <input
                      type="text"
                      className="input-field focus:border-amber-500 focus:ring-amber-500"
                      placeholder="e.g. Medical emergency"
                      value={advanceModal.reason}
                      onChange={e => setAdvanceModal({ ...advanceModal, reason: e.target.value })}
                    />
                  </div>
                  <button disabled={isPending || advanceModal.amount <= 0} onClick={handleAdvance} className="btn w-full py-3.5 text-base font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 mt-2 border-none">
                    <Wallet className="h-5 w-5" /> Record Advance
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
