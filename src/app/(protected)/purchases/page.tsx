import { getSuppliers, getPurchaseInvoices } from "@/app/actions/purchases";
import { getAllProductsForBilling } from "@/app/actions/billing";
import { requireAdmin } from "@/lib/auth";
import { PackagePlus } from "lucide-react";
import { PurchasesClient } from "./PurchasesClient";

export default async function PurchasesPage() {
  await requireAdmin();

  const [suppliers, purchases, products] = await Promise.all([
    getSuppliers(),
    getPurchaseInvoices(),
    getAllProductsForBilling()
  ]);

  return (
    <div className="animate-fade-in pb-8">
      <div className="pb-6 border-b border-border/50 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
            <PackagePlus className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="page-title">Purchases & Suppliers</h1>
            <p className="page-subtitle">
              Manage incoming stock and accounts payable
            </p>
          </div>
        </div>
      </div>

      <PurchasesClient 
        initialSuppliers={suppliers} 
        initialPurchases={purchases} 
        products={products}
      />
    </div>
  );
}
