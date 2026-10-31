"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldAlert, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteInvoicesWithAuth } from "@/app/actions/invoices";

type BillRow = { id: number; label: string; total: number };

type Selection = {
  allSelected: boolean;
  someSelected: boolean;
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  toggleAll: () => void;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("Must be used inside InvoiceBulkDelete");
  return ctx;
}

const CHECKBOX = "h-4 w-4 rounded border-border accent-primary cursor-pointer align-middle";

/** Header checkbox: selects every bill on the current page. */
export function InvoiceSelectAll() {
  const { allSelected, someSelected, toggleAll } = useSelection();
  return (
    <input
      type="checkbox"
      aria-label="Select all bills on this page"
      title="Select all bills on this page"
      className={CHECKBOX}
      checked={allSelected}
      ref={(el) => {
        if (el) el.indeterminate = someSelected && !allSelected;
      }}
      onChange={toggleAll}
    />
  );
}

export function InvoiceRowCheckbox({ id }: { id: number }) {
  const { isSelected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      aria-label="Select this bill"
      className={CHECKBOX}
      checked={isSelected(id)}
      onChange={() => toggle(id)}
    />
  );
}

/**
 * Wraps the invoices table: holds the selection, shows the "Delete selected"
 * bar, and asks for the password once for the whole selection. Only bills on
 * the current page can be selected, so nothing hidden is ever deleted.
 */
export function InvoiceBulkDelete({ invoices, children }: { invoices: BillRow[]; children: React.ReactNode }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Bills on the page right now: changing page or filter drops the rest
  const selected = useMemo(() => invoices.filter((inv) => selectedIds.has(inv.id)), [invoices, selectedIds]);
  const totalAmount = selected.reduce((sum, inv) => sum + inv.total, 0);

  const selection: Selection = {
    allSelected: invoices.length > 0 && selected.length === invoices.length,
    someSelected: selected.length > 0,
    isSelected: (id) => selectedIds.has(id),
    toggle: (id) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleAll: () =>
      setSelectedIds(selected.length === invoices.length ? new Set() : new Set(invoices.map((inv) => inv.id))),
  };

  const close = () => {
    setIsOpen(false);
    setPassword("");
    setShowPassword(false);
  };

  const handleDelete = async () => {
    if (!password.trim() || isPending) return;
    setIsPending(true);
    const result = await deleteInvoicesWithAuth(selected.map((inv) => inv.id), password);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.count} bill${result.count === 1 ? "" : "s"} deleted`);
    setSelectedIds(new Set());
    close();
    router.refresh();
  };

  return (
    <SelectionContext.Provider value={selection}>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-rose-500/5">
          <p className="text-sm font-semibold text-foreground">
            {selected.length} bill{selected.length === 1 ? "" : "s"} selected · ₹{totalAmount.toFixed(2)}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedIds(new Set())} className="btn btn-ghost btn-sm">
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="btn btn-sm flex items-center gap-1.5 text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </button>
          </div>
        </div>
      )}

      {children}

      {/* Portal to <body> so no transformed parent can trap this fixed overlay */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Delete {selected.length} bill{selected.length === 1 ? "" : "s"}
                </h2>
                <button onClick={close} className="p-2 hover:bg-muted rounded-xl transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 rounded-xl p-4">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1">
                    This action cannot be undone.
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-400/80 leading-relaxed">
                    {selected.map((inv) => inv.label).join(", ")} (total ₹{totalAmount.toFixed(2)}) will be
                    permanently deleted. Stock will be restored and customer credit balance will be reversed.
                  </p>
                </div>

                <div>
                  <label className="input-label">
                    Admin Password
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(asked once for all)</span>
                  </label>
                  <div className="relative">
                    <input
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      autoComplete="off"
                      className="input-field pr-10"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex gap-3">
                <button onClick={close} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending || !password.trim()}
                  className="btn flex-1 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    "Deleting…"
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </SelectionContext.Provider>
  );
}
