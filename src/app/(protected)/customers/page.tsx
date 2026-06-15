import { getCustomers } from "@/app/actions/customers";
import { CustomersClient } from "./CustomersClient";
import { Users } from "lucide-react";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="animate-fade-in pb-8">
      {/* Page Header */}
      <div className="pb-6 border-b border-border/50 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h1 className="page-title">Customer Management</h1>
              <p className="page-subtitle">
                {customers.length} customer{customers.length !== 1 ? "s" : ""} · Manage accounts, history & credit (Khata)
              </p>
            </div>
          </div>
        </div>
      </div>

      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
