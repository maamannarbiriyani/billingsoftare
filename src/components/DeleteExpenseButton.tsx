"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";

export function DeleteExpenseButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this expense?")) {
      startTransition(async () => {
        const result = await deleteExpense(id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Expense deleted successfully.");
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
      title="Delete Expense"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
