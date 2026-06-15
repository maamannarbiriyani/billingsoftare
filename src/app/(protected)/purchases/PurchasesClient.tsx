"use client";

import { useState, useTransition } from "react";
import { Plus, Building2, PackagePlus, FileText, Search, PlusCircle, X, Receipt } from "lucide-react";
import { toast } from "sonner";
import { createSupplier, createPurchaseInvoice } from "@/app/actions/purchases";

export function PurchasesClient({ initialSuppliers, initialPurchases, products }: any) {
  const [activeTab, setActiveTab] = useState<"purchases" | "suppliers">("purchases");
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Handle new supplier
  const handleCreateSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      gstNumber: formData.get("gstNumber") as string,
      address: formData.get("address") as string,
    };
    startTransition(async () => {
      const res = await createSupplier(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Supplier added!");
        setShowSupplierModal(false);
        // Page refresh or server-action handles the list update
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border">
        <button
          className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === "purchases" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("purchases")}
        >
          Purchase Orders
        </button>
        <button
          className={`pb-3 px-4 text-sm font-semibold transition-colors ${activeTab === "suppliers" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("suppliers")}
        >
          Suppliers Directory
        </button>
      </div>

      {activeTab === "suppliers" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowSupplierModal(true)} className="btn btn-primary">
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          </div>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Phone</th>
                  <th>GST Number</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">No suppliers found.</td>
                  </tr>
                ) : (
                  suppliers.map((s: any) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-foreground">{s.name}</td>
                      <td>{s.phone || "-"}</td>
                      <td>{s.gstNumber || "-"}</td>
                      <td>{s.address || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "purchases" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowPurchaseModal(true)} className="btn btn-primary bg-teal-600 hover:bg-teal-700 shadow-teal-200 border-teal-700">
              <PackagePlus className="h-4 w-4" /> New Purchase Order
            </button>
          </div>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
             <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Supplier</th>
                  <th className="text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {initialPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">No purchase orders found.</td>
                  </tr>
                ) : (
                  initialPurchases.map((p: any) => (
                    <tr key={p.id}>
                      <td suppressHydrationWarning>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="font-medium text-foreground/90">{p.invoiceNumber}</td>
                      <td>{p.supplier?.name}</td>
                      <td className="text-right font-bold text-teal-700 dark:text-teal-400">₹{p.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <h2 className="font-bold text-foreground">Add New Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 text-muted-foreground/80 hover:bg-muted/50 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div>
                <label className="input-label">Supplier Name *</label>
                <input name="name" required className="input-field" placeholder="Acme Distributors" />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input name="phone" className="input-field" placeholder="+91..." />
              </div>
              <div>
                <label className="input-label">GST Number</label>
                <input name="gstNumber" className="input-field" placeholder="29XXXXX..." />
              </div>
              <div>
                <label className="input-label">Address</label>
                <textarea name="address" rows={2} className="input-field resize-none" placeholder="123 Warehouse St..." />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isPending} className="btn btn-primary">{isPending ? "Saving..." : "Save Supplier"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <PurchaseOrderModal 
          suppliers={suppliers} 
          products={products} 
          onClose={() => setShowPurchaseModal(false)} 
        />
      )}
    </div>
  );
}

function PurchaseOrderModal({ suppliers, products, onClose }: any) {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [costPrice, setCostPrice] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!selectedProduct || !qty || !costPrice) return;
    const prod = products.find((p: any) => p.id === parseInt(selectedProduct));
    if (!prod) return;

    setCart([...cart, { 
      productId: prod.id, 
      name: prod.name, 
      qty: parseInt(qty), 
      costPrice: parseFloat(costPrice) 
    }]);
    setSelectedProduct("");
    setQty("1");
    setCostPrice("");
  };

  const total = cart.reduce((acc, item) => acc + (item.qty * item.costPrice), 0);

  const handleSubmit = () => {
    if (!supplierId || !invoiceNumber || cart.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    startTransition(async () => {
      const res = await createPurchaseInvoice(parseInt(supplierId), invoiceNumber, cart, total);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Purchase Order created & Stock updated!");
        window.location.reload();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted">
          <h2 className="font-bold text-foreground flex items-center gap-2"><Receipt className="h-5 w-5 text-teal-600"/> New Purchase Order</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground/80 hover:bg-muted/50 rounded"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Supplier *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input-field" required>
                <option value="">Select a supplier...</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Invoice / Bill Number *</label>
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="input-field" placeholder="INV-001" required/>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-xl border border-border">
            <h3 className="text-sm font-bold text-foreground/90 mb-3">Add Products to PO</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                 <label className="input-label text-xs">Product</label>
                 <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="input-field py-2 text-sm">
                   <option value="">Select Product...</option>
                   {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Current stock: {p.stock})</option>)}
                 </select>
              </div>
              <div className="w-24">
                 <label className="input-label text-xs">Qty</label>
                 <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="input-field py-2 text-sm"/>
              </div>
              <div className="w-32">
                 <label className="input-label text-xs">Cost/Unit (₹)</label>
                 <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="input-field py-2 text-sm"/>
              </div>
              <button type="button" onClick={handleAdd} className="btn btn-secondary h-[38px]"><PlusCircle className="h-4 w-4"/></button>
            </div>
          </div>

          {cart.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="data-table">
                <thead className="bg-muted">
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Cost Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td className="text-right">{item.qty}</td>
                      <td className="text-right">₹{item.costPrice.toFixed(2)}</td>
                      <td className="text-right font-bold">₹{(item.qty * item.costPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-muted">
          <div className="text-muted-foreground">
            Grand Total: <span className="text-xl font-black text-teal-700 dark:text-teal-400 ml-2">₹{total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={isPending || cart.length === 0} className="btn btn-primary bg-teal-600 border-teal-700 hover:bg-teal-700">
               {isPending ? "Processing..." : "Create Purchase Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
