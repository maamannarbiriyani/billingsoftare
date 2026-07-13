import { prisma } from "@/lib/prisma";
import { requireAdmin, getActiveBranchId } from "@/lib/auth";
import { Receipt, Calendar, Tag, FileText } from "lucide-react";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";

export default async function ExpensesPage() {
  await requireAdmin();
  const branchId = await getActiveBranchId();
  if (!branchId) return <div>No active branch selected.</div>;

  const expenses = await prisma.expense.findMany({
    where: { branchId },
    orderBy: { date: "desc" },
  });

  const totalThisMonth = expenses
    .filter((e) => {
      const now = new Date();
      return e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle mt-1">
            Track and manage your operational costs
          </p>
        </div>
        <AddExpenseForm />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Expenses This Month</p>
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">
              ₹{totalThisMonth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Receipt className="h-7 w-7 text-muted-foreground/80" />
                      </div>
                      <p className="font-semibold text-muted-foreground">No expenses logged</p>
                      <p className="text-sm mt-1">Add your first expense to track costs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Calendar className="h-4 w-4 text-muted-foreground/80" />
                        {expense.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" })}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple">
                        <Tag className="h-3 w-3" />
                        {expense.category}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-foreground/90">
                        <FileText className="h-4 w-4 text-muted-foreground/80" />
                        {expense.description}
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-rose-600">
                        ₹{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="text-right">
                      <DeleteExpenseButton id={expense.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
