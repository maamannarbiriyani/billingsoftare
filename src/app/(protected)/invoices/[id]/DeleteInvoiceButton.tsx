"use client";

import { useState } from "react";
import { Trash2, X, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { deleteInvoiceWithAuth } from "@/app/actions/invoices";
import { useRouter } from "next/navigation";

export function DeleteInvoiceButton({ invoiceId, invoiceNumber }: { invoiceId: number; invoiceNumber: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!password.trim()) {
      toast.error("Enter your admin password to confirm deletion");
      return;
    }
    setIsPending(true);
    const result = await deleteInvoiceWithAuth(invoiceId, password);
    if (result.error) {
      toast.error(result.error);
      setIsPending(false);
    } else {
      toast.success(`Invoice ${invoiceNumber} deleted`);
      router.push("/invoices");
    }
  };

  const close = () => {
    setIsOpen(false);
    setPassword("");
    setShowPassword(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-sm flex items-center gap-1.5 text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                Delete Invoice
              </h2>
              <button onClick={close} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Warning */}
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 rounded-xl p-4">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1">
                  This action cannot be undone.
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400/80 leading-relaxed">
                  Invoice <strong>{invoiceNumber}</strong> will be permanently deleted.
                  Stock will be restored and customer credit balance will be reversed.
                </p>
              </div>

              {/* Password field */}
              <div>
                <label className="input-label">
                  Admin Password
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(required to confirm)</span>
                </label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showPassword ? "text" : "password"}
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

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button onClick={close} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={isPending || !password.trim()}
                className="btn flex-1 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  "Deleting…"
                ) : (
                  <><Trash2 className="h-4 w-4" /> Confirm Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
