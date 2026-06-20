"use client";

import { useState } from "react";
import { X, RefreshCcw, AlertTriangle } from "lucide-react";
import { processReturn } from "@/app/actions/invoices";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ConfirmModal";

export function ReturnModal({ invoice }: { invoice: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<number, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const isRefunded = invoice.status === "REFUNDED";
  const isPartial = invoice.status === "PARTIAL_REFUND";

  const handleQtyChange = (itemId: number, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setReturnQty((prev) => ({ ...prev, [itemId]: validQty }));
  };

  const totalReturning = Object.values(returnQty).reduce((a, b) => a + b, 0);

  const handleSubmit = () => {
    if (totalReturning <= 0) {
      toast.error("Please select at least one item to return.");
      return;
    }
    setShowConfirm(true);
  };

  const processActualReturn = async () => {
    setIsPending(true);

    const itemsToReturn = Object.entries(returnQty)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const id = parseInt(itemId);
        const item = invoice.items.find((i: any) => i.id === id);
        return {
          invoiceItemId: id,
          productId: item.productId,
          qtyToReturn: qty,
        };
      });

    const result = await processReturn(invoice.id, itemsToReturn);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Return processed successfully! Refund amount: ₹${result.refundedAmount?.toFixed(2) || "0.00"}`);
      setIsOpen(false);
      setReturnQty({});
    }
    setIsPending(false);
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(true)}
          disabled={isRefunded}
          className="btn btn-secondary border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50 disabled:border-border disabled:text-muted-foreground/80"
        >
          <RefreshCcw className={`h-4 w-4 ${!isRefunded ? 'text-orange-500' : ''}`} />
          Process Return
        </button>

        {isRefunded && (
          <span className="badge badge-danger">
            Fully Refunded
          </span>
        )}
        {isPartial && (
          <span className="badge badge-warning">
            Partial Return
          </span>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-muted">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <RefreshCcw className="h-5 w-5 text-orange-500" /> 
                Return Items
              </h2>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-muted-foreground/80 hover:text-muted-foreground rounded-lg hover:bg-border transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-sm shadow-sm">
                 <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                 <p className="leading-relaxed">Select the quantity to return for each item. This action will restock inventory and reduce the invoice total.</p>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
                {invoice.items.map((item: any) => {
                  const maxReturnable = item.qty - item.returnedQty;
                  const currentReturning = returnQty[item.id] || 0;
                  
                  return (
                    <div key={item.id} className="flex justify-between items-center p-4 border border-border rounded-xl hover:border-border/80 transition-colors bg-card">
                      <div>
                        <p className="font-bold text-foreground leading-tight">{item.product.name}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-1">
                          ₹{item.price.toFixed(2)} &nbsp;&middot;&nbsp; Bought: <span className="text-foreground/90">{item.qty}</span> &nbsp;&middot;&nbsp; Ret: <span className="text-foreground/90">{item.returnedQty}</span>
                        </p>
                      </div>
                      
                      {maxReturnable > 0 ? (
                         <div className="flex items-center gap-2 bg-muted p-1.5 rounded-lg border border-border/50">
                           <span className="text-xs text-muted-foreground font-bold ml-1 uppercase tracking-wider">Return</span>
                           <input
                             type="number"
                             min="0"
                             max={maxReturnable}
                             value={currentReturning}
                             onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0, maxReturnable)}
                             className="w-14 text-center border border-border rounded-md py-1 px-1.5 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 font-bold text-foreground outline-none"
                           />
                           <span className="text-xs font-bold text-muted-foreground/80 mr-1">/ {maxReturnable}</span>
                         </div>
                      ) : (
                         <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md">
                           Fully Returned
                         </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted border-t border-border/50 flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || totalReturning <= 0}
                className="btn text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-orange-200"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Confirm Return (${totalReturning} items)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        title="Process Return"
        message="Are you sure you want to process this return? This will update inventory and totals."
        confirmText="Process Return"
        onConfirm={processActualReturn}
        onCancel={() => setShowConfirm(false)}
        isLoading={isPending}
      />
    </>
  );
}
