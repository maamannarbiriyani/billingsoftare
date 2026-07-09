"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/app/actions/product";
import { Package, Barcode, Tag, IndianRupee, Hash, ArrowLeft, Save, AlertCircle, Percent } from "lucide-react";

type ProductFormProps = {
  initialData?: {
    id: number;
    name: string;
    barcode: string | null;
    price: number;
    costPrice: number;
    gstRate: number;
    stock: number;
    category: string | null;
    unit?: string | null;
    hsnCode?: string | null;
    imageUrl?: string | null;
  };
};

export function ProductForm({ initialData }: ProductFormProps) {
  const isEdit = !!initialData;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(initialData?.price?.toString() ?? "");
  const [costPrice, setCostPrice] = useState(initialData?.costPrice?.toString() ?? "");
  const [trackStock, setTrackStock] = useState(isEdit ? (initialData?.stock !== 999999) : false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const router = useRouter();

  // Calculate live margin
  const p = parseFloat(price) || 0;
  const c = parseFloat(costPrice) || 0;
  const marginPct = p > 0 ? ((p - c) / p) * 100 : 0;
  const marginAmt = p - c;

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    let result;
    if (isEdit) {
      result = await updateProduct(initialData.id, formData);
    } else {
      result = await createProduct(formData);
    }
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  }

  const fields = [
    {
      id: "name",
      name: "name",
      label: "Product Name",
      type: "text",
      required: true,
      defaultValue: initialData?.name ?? "",
      placeholder: "e.g. Basmati Rice 1kg",
      hint: "Required",
      icon: Package,
      colSpan: "sm:col-span-2",
      prefix: null,
    },
    {
      id: "barcode",
      name: "barcode",
      label: "Barcode / SKU",
      type: "text",
      required: false,
      defaultValue: initialData?.barcode ?? "",
      placeholder: "Leave blank to auto-generate",
      hint: "Optional",
      icon: Barcode,
      colSpan: "",
      prefix: null,
    },
    {
      id: "category",
      name: "category",
      label: "Category",
      type: "text",
      required: false,
      defaultValue: initialData?.category ?? "",
      placeholder: "e.g. Groceries, Electronics",
      hint: "Optional",
      icon: Tag,
      colSpan: "",
      prefix: null,
    },
    {
      id: "hsnCode",
      name: "hsnCode",
      label: "HSN / SAC Code",
      type: "text",
      required: false,
      defaultValue: initialData?.hsnCode ?? "",
      placeholder: "e.g. 1006, 9963",
      hint: "For GST filing",
      icon: Hash,
      colSpan: "",
      prefix: null,
    },
  ];

  const stockField = {
    id: "stock",
    name: "stock",
    label: "Stock Quantity",
    type: "number",
    required: true,
    defaultValue: initialData?.stock !== 999999 ? (initialData?.stock?.toString() ?? "") : "",
    placeholder: "0",
    hint: "Required",
    icon: Hash,
    colSpan: "sm:col-span-2",
    prefix: null,
  };

  return (
    <div className="max-w-2xl">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/50">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? "Edit Product" : "Add New Product"}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editing "${initialData.name}"` : "Fill in the product details below"}
          </p>
        </div>
      </div>

      {/* Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-slate-50/50">
          <h2 className="section-title">Product Details</h2>
          <p className="section-subtitle">Fields marked with * are required</p>
        </div>

        <form action={handleSubmit} className="p-6" encType="multipart/form-data">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id} className={field.colSpan}>
                <label htmlFor={field.id} className="input-label">
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  <span className="ml-2 font-normal text-muted-foreground/80">{field.hint}</span>
                </label>
                <div className="relative mt-1">
                  <input
                    id={field.id}
                    name={field.name}
                    type={field.type}
                    required={field.required}
                    defaultValue={field.defaultValue}
                    placeholder={field.placeholder}
                    className="input-field"
                  />
                </div>
              </div>
            ))}

            {/* Inventory Tracking Toggle */}
            <div className="sm:col-span-2 flex items-center justify-between p-4 border border-border/50 rounded-xl bg-muted mt-2">
              <div>
                <h3 className="font-semibold text-foreground">Track Inventory Count?</h3>
                <p className="text-sm text-muted-foreground">Enable this if you want to track remaining stock for this item.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Conditional Stock Field or Hidden Unlimited Stock */}
            {trackStock ? (
              <div className={stockField.colSpan}>
                <label htmlFor={stockField.id} className="input-label">
                  {stockField.label}
                  {stockField.required && <span className="text-rose-500 ml-0.5">*</span>}
                  <span className="ml-2 font-normal text-muted-foreground/80">{stockField.hint}</span>
                </label>
                <div className="relative mt-1">
                  <input
                    id={stockField.id}
                    name={stockField.name}
                    type={stockField.type}
                    required={stockField.required}
                    defaultValue={stockField.defaultValue}
                    placeholder={stockField.placeholder}
                    className="input-field"
                  />
                </div>
              </div>
            ) : (
              <input type="hidden" name="stock" value="999999" />
            )}

            {/* Image Upload */}
            <div className="sm:col-span-2 border-t border-border/50 pt-5 mt-2">
              <h3 className="text-sm font-bold text-foreground mb-4">Product Image</h3>
              <div className="flex items-center gap-6">
                {(initialData?.imageUrl || previewImage) && (
                  <div className="w-24 h-24 rounded-xl border border-border overflow-hidden shrink-0 bg-muted">
                    <img src={previewImage || initialData?.imageUrl || ""} alt="Product" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <label htmlFor="image" className="input-label">Upload Banner Photo</label>
                  <input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPreviewImage(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground/80 mt-2">Max file size: 5MB. Any image format.</p>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-border/50 pt-5 mt-2">
              <h3 className="text-sm font-bold text-foreground mb-4">Pricing & Profit</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="costPrice" className="input-label">
                    Cost Price (Purchase)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 text-sm font-medium pointer-events-none">₹</span>
                    <input
                      id="costPrice"
                      name="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="input-field pl-7"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="gstRate" className="input-label">GST Rate (%)</label>
                  <select id="gstRate" name="gstRate" defaultValue={initialData?.gstRate || 0} className="input-field mt-1">
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="unit" className="input-label">Unit of Measure</label>
                  <select id="unit" name="unit" defaultValue={initialData?.unit || "pcs"} className="input-field mt-1">
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="L">L (Litre)</option>
                    <option value="ml">ml (Millilitre)</option>
                    <option value="box">box</option>
                    <option value="dozen">dozen</option>
                    <option value="plate">plate</option>
                    <option value="bottle">bottle</option>
                    <option value="pack">pack</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="price" className="input-label">
                    Selling Price
                    <span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 text-sm font-medium pointer-events-none">₹</span>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="input-field pl-7"
                    />
                  </div>
                </div>

                {/* Margin Calculator Display */}
                <div className="sm:col-span-2 bg-muted border border-border/50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated Profit</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-xl font-bold ${marginAmt > 0 ? 'text-emerald-600' : marginAmt < 0 ? 'text-rose-600' : 'text-foreground/90'}`}>
                        ₹{marginAmt.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">per item</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profit Margin</p>
                    <div className={`inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-md text-sm font-bold ${marginPct > 0 ? 'bg-emerald-100 text-emerald-700' : marginPct < 0 ? 'bg-rose-100 text-rose-700' : 'bg-border text-foreground/90'}`}>
                      <Percent className="h-3 w-3" />
                      {marginPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Note */}
          {(isEdit && trackStock) && (
            <div className="mt-6 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>Updating stock will set it to the new value, not add to existing stock.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-border/50">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isEdit ? "Update Product" : "Create Product"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
