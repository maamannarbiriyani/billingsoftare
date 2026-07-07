"use client";

import { useState } from "react";
import { logPayment, createCustomer, updateCustomer, deleteCustomer } from "@/app/actions/customers";
import { User, Phone, Banknote, Search, IndianRupee, X, CheckCircle, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function CustomersClient({ initialCustomers }: { initialCustomers: any[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", balance: "" });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.phone && c.phone.includes(query))
  );

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setIsPending(true);
    const result = await logPayment(selectedCustomer.id, amount);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment recorded successfully!");
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id ? { ...c, balance: c.balance - amount } : c
        )
      );
      setSelectedCustomer(null);
      setPaymentAmount("");
    }
    setIsPending(false);
  }

  async function handleCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    if (isEditing && selectedCustomer) {
      const res = await updateCustomer(selectedCustomer.id, formData.name, formData.phone, parseFloat(formData.balance) || 0);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Customer updated!");
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, ...res.customer } : c));
        setSelectedCustomer({ ...selectedCustomer, ...res.customer });
        setIsEditing(false);
      }
    } else {
      const res = await createCustomer(formData.name, formData.phone, parseFloat(formData.balance) || 0);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Customer added!");
        setCustomers(prev => [...prev, { ...res.customer, _count: { invoices: 0 } }]);
        setShowAddForm(false);
      }
    }
    setIsPending(false);
  }

  async function handleDelete(e: React.MouseEvent, customerId: number, customerName: string) {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${customerName}?\n\nNote: You cannot delete a customer who has existing bills.`)) return;
    setIsPending(true);
    const res = await deleteCustomer(customerId);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Customer deleted!");
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
        setShowAddForm(false);
      }
    }
    setIsPending(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Customer List — 2/3 width */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search & Add */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or phone number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ name: "", phone: "", balance: "" });
              setIsEditing(false);
              setSelectedCustomer(null);
              setShowAddForm(true);
            }} 
            className="btn btn-primary flex-shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="text-center">Total Invoices</th>
                  <th className="text-right">Credit Balance</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                          <Users className="h-6 w-6 text-muted-foreground/80" />
                        </div>
                        <p className="font-semibold text-muted-foreground">No customers found</p>
                        <p className="text-sm mt-1">
                          {query ? "Try a different search term" : "Customers are added automatically when billing"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`cursor-pointer ${selectedCustomer?.id === customer.id ? "bg-indigo-50/60" : ""}`}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setPaymentAmount(customer.balance > 0 ? customer.balance.toFixed(2) : "");
                      }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge badge-default">{customer._count?.invoices || 0} invoices</span>
                      </td>
                      <td className="text-right">
                        <span
                          className={`badge ${
                            customer.balance > 0 ? "badge-warning" : "badge-success"
                          }`}
                        >
                          ₹{customer.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ name: customer.name, phone: customer.phone || "", balance: customer.balance ? customer.balance.toString() : "" });
                              setIsEditing(true);
                              setSelectedCustomer(customer);
                              setShowAddForm(true);
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, customer.id, customer.name)}
                            className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(customer);
                              setPaymentAmount(customer.balance > 0 ? customer.balance.toFixed(2) : "");
                              setShowAddForm(false);
                            }}
                            className="btn btn-ghost btn-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="lg:col-span-1">
        {showAddForm ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden sticky top-20">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted">
              <div>
                <h3 className="section-title">{isEditing ? "Edit Customer" : "New Customer"}</h3>
                <p className="section-subtitle">{isEditing ? "Update details" : "Add a regular customer"}</p>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div>
                  <label className="input-label">Customer Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field pl-9"
                      required
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field pl-9"
                      placeholder="9999999999"
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label">Credit Balance (Amount)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80 pointer-events-none" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                      className="input-field pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary flex-1"
                  >
                    {isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : selectedCustomer ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden sticky top-20">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted">
              <div>
                <h3 className="section-title">Manage Khata</h3>
                <p className="section-subtitle">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Balance Display */}
              <div className={`flex items-center justify-between p-4 rounded-xl mb-5 ${
                selectedCustomer.balance > 0
                  ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
              } border`}>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                    selectedCustomer.balance > 0 ? "text-orange-700 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400"
                  }`}>
                    {selectedCustomer.balance > 0 ? "Amount Due" : "Account Status"}
                  </p>
                  <p className={`text-2xl font-black ${
                    selectedCustomer.balance > 0 ? "text-orange-600 dark:text-orange-300" : "text-emerald-600 dark:text-emerald-300"
                  }`}>
                    {selectedCustomer.balance > 0 ? `₹${selectedCustomer.balance.toFixed(2)}` : "Cleared"}
                  </p>
                </div>
                {selectedCustomer.balance > 0
                  ? <Banknote className="h-8 w-8 text-orange-300 dark:text-orange-500/50" />
                  : <CheckCircle className="h-8 w-8 text-emerald-400 dark:text-emerald-500/50" />
                }
              </div>

              {/* Payment Form or Cleared State */}
              {selectedCustomer.balance > 0 ? (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="input-label">Payment Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80 pointer-events-none" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={selectedCustomer.balance}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="input-field pl-9"
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="btn btn-secondary w-full"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="btn btn-primary w-full"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Processing...
                        </span>
                      ) : "Log Payment"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-2">
                  <p className="text-emerald-600 text-sm font-semibold mb-4">All dues have been cleared! ✓</p>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="btn btn-secondary w-full"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-dashed border-border h-64 flex flex-col items-center justify-center text-muted-foreground/80 select-none">
            <User className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a customer</p>
            <p className="text-xs mt-1">Click any row to manage</p>
          </div>
        )}
      </div>
    </div>
  );
}
