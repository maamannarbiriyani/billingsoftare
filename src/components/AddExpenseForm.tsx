"use client";

import { useState, useTransition } from "react";
import { createExpense } from "@/app/actions/expenses";
import { Plus, X, Receipt, IndianRupee, Calendar, Tag, FileText } from "lucide-react";
import { toast } from "sonner";

export function AddExpenseForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await createExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense logged successfully.");
        setIsOpen(false);
      }
    });
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        <Plus className="h-4 w-4" />
        Add Expense
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-rose-500" />
            Log New Expense
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleAction} className="p-6 space-y-4">
          <div>
            <label htmlFor="amount" className="input-label">Amount <span className="text-rose-500">*</span></label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="input-field pl-7"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="input-label">Category <span className="text-rose-500">*</span></label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Tag className="h-4 w-4"/></span>
              <select id="category" name="category" required className="input-field pl-9">
                <option value="">Select a category</option>
                <option value="Electricity">Electricity & Utilities</option>
                <option value="Salary">Staff Salary</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Supplies">Store Supplies / Cleaning</option>
                <option value="Rent">Rent</option>
                <option value="Marketing">Marketing / Ads</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="input-label">Description <span className="text-rose-500">*</span></label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-3 text-slate-400"><FileText className="h-4 w-4"/></span>
              <textarea
                id="description"
                name="description"
                required
                rows={2}
                placeholder="e.g. Paid electricity bill for Jan"
                className="input-field pl-9 resize-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="date" className="input-label">Date <span className="text-rose-500">*</span></label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Calendar className="h-4 w-4"/></span>
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="input-field pl-9"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isPending}
              className="btn bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 shadow-md border-rose-700"
            >
              {isPending ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
