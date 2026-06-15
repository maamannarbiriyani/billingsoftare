"use client";

import { useState } from "react";
import { Pencil, X, Plus, Minus, Search, Trash2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { modifyInvoice, ModifyItem } from "@/app/actions/invoices";
import { getAllProductsForBilling } from "@/app/actions/billing";

type EditItem = {
  itemId?: number;
  productId: number;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
};

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "SPLIT", "CREDIT"];

export function EditInvoiceModal({ invoice }: { invoice: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [items, setItems] = useState<EditItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [gstRate, setGstRate] = useState(0);
  const [notes, setNotes] = useState("");

  // Product search for adding new items
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const openModal = async () => {
    setItems(
      invoice.items.map((i: any) => ({
        itemId: i.id,
        productId: i.productId,
        name: i.product.name,
        price: i.price,
        costPrice: i.costPrice || 0,
        qty: i.qty,
      }))
    );
    setDiscount(invoice.discountAmount || 0);
    setPaymentMethod(invoice.paymentMethod || "Cash");
    setGstRate(invoice.gstRate || 0);
    setNotes(invoice.notes || "");
    setIsOpen(true);
    const prods = await getAllProductsForBilling();
    setAllProducts(prods);
  };

  // Live total calculations
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
  const total = Math.max(0, subtotal + gstAmount - discount);

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };

  const updatePrice = (idx: number, val: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, price: Math.max(0, val) } : item))
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addProduct = (product: any) => {
    const existing = items.findIndex((i) => i.productId === product.id);
    if (existing !== -1) {
      setItems((prev) =>
        prev.map((item, i) => (i === existing ? { ...item, qty: item.qty + 1 } : item))
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          costPrice: product.costPrice || 0,
          qty: 1,
        },
      ]);
    }
    setSearchQuery("");
    setShowSearch(false);
  };

  const filteredProducts = allProducts.filter(
    (p) =>
      searchQuery.length > 0 &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery))
  );

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Bill must have at least one item");
      return;
    }
    setIsPending(true);
    const modItems: ModifyItem[] = items.map((i) => ({
      itemId: i.itemId,
      productId: i.productId,
      qty: i.qty,
      price: i.price,
      costPrice: i.costPrice,
    }));
    const result = await modifyInvoice(invoice.id, {
      items: modItems,
      discountAmount: discount,
      paymentMethod,
      gstRate,
      notes,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice updated successfully");
      setIsOpen(false);
      window.location.reload();
    }
    setIsPending(false);
  };

  return (
    <>
      <button onClick={openModal} className="btn btn-secondary btn-sm flex items-center gap-1.5">
        <Pencil className="h-4 w-4" />
        Edit Bill
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" /> Edit Invoice
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{invoice.invoiceNumber} — changes recalculate totals and restock/deduct inventory</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Items</h3>
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="btn btn-sm btn-secondary flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </div>

                {/* Product search */}
                {showSearch && (
                  <div className="relative mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        autoFocus
                        type="text"
                        className="input-field pl-9"
                        placeholder="Search by name or barcode…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    {filteredProducts.length > 0 && (
                      <div className="absolute z-10 top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {filteredProducts.slice(0, 8).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex justify-between items-center border-b border-border last:border-b-0"
                          >
                            <span className="font-medium text-foreground">{p.name}</span>
                            <span className="text-xs font-bold text-primary">₹{p.price.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Items table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Item</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-muted-foreground uppercase tracking-wide w-32">Qty</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wide w-28">Price (₹)</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wide w-24">Total</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{item.name}</span>
                            {item.itemId == null && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">NEW</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateQty(idx, -1)}
                                className="w-7 h-7 rounded-md bg-muted hover:bg-border flex items-center justify-center transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-foreground">{item.qty}</span>
                              <button
                                onClick={() => updateQty(idx, 1)}
                                className="w-7 h-7 rounded-md bg-muted hover:bg-border flex items-center justify-center transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-muted border border-border rounded-lg px-2 py-1 text-sm font-bold text-foreground outline-none focus:border-primary transition-colors"
                            />
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-foreground">
                            ₹{(item.price * item.qty).toFixed(2)}
                          </td>
                          <td className="px-2 py-3">
                            <button
                              onClick={() => removeItem(idx)}
                              className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                            No items — add items above
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="input-label">Payment Method</label>
                    <select
                      className="input-field"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">GST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="input-field"
                      value={gstRate}
                      onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={discount || ""}
                      placeholder="0.00"
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="input-label">Notes</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Bill modified by manager"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Live totals */}
                <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-2.5 text-sm self-start">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST ({gstRate}%)</span>
                    <span className="font-bold text-foreground">+ ₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-bold">- ₹{discount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 mt-1 border-t border-border flex justify-between">
                    <span className="font-black text-foreground uppercase tracking-wide">Total</span>
                    <span className="font-black text-xl text-primary">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="pt-1 text-xs text-muted-foreground">
                    Original total: ₹{invoice.total.toFixed(2)}
                    {total !== invoice.total && (
                      <span className={`ml-2 font-bold ${total > invoice.total ? "text-rose-500" : "text-emerald-500"}`}>
                        ({total > invoice.total ? "+" : ""}₹{(total - invoice.total).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0 bg-muted/30">
              <button onClick={() => setIsOpen(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || items.length === 0}
                className="btn btn-primary flex-[2] flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
