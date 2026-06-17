import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";
import Link from "next/link";
import { Package, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; stock?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const catFilter = params.category || "";
  const stockFilter = params.stock || "";

  const where: any = {};
  if (catFilter) where.category = catFilter;
  if (stockFilter === "low") where.AND = [{ stock: { lt: 10 } }, { stock: { not: 999999 } }];

  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { category: { not: null } },
    }),
  ]);

  const cats = categories.map(c => c.category).filter(Boolean) as string[];
  const lowStockCount = products.filter(p => p.stock < 10 && p.stock !== 999999).length;

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ category: catFilter, stock: stockFilter, ...overrides });
    if (!p.get("category")) p.delete("category");
    if (!p.get("stock")) p.delete("stock");
    return `/owner/products?${p.toString()}`;
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Package className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Products</h1>
            <p className="text-xs text-slate-500">{products.length} items · {lowStockCount} low stock</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        <Link href={buildHref({ category: "", stock: "" })}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!catFilter && !stockFilter ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          All
        </Link>
        <Link href={buildHref({ stock: "low", category: "" })}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${stockFilter === "low" ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </Link>
        {cats.map(cat => (
          <Link key={cat} href={buildHref({ category: cat, stock: "" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === cat ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {cat}
          </Link>
        ))}
      </div>

      {/* Product grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(p => {
                  const isLow = p.stock < 10 && p.stock !== 999999;
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isLow ? "bg-amber-50/40" : ""}`}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        {p.barcode && <p className="text-xs text-slate-400 mt-0.5">SKU: {p.barcode}</p>}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-slate-500">{p.category || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold text-slate-900">₹{p.price.toFixed(2)}</span>
                        {p.costPrice > 0 && (
                          <p className="text-xs text-slate-400">Cost: ₹{p.costPrice.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {p.stock === 999999 ? (
                          <span className="text-xs text-slate-400">Unlimited</span>
                        ) : (
                          <span className={`text-sm font-bold ${isLow ? "text-amber-600" : "text-emerald-600"}`}>
                            {p.stock} {p.unit}
                          </span>
                        )}
                        {isLow && (
                          <p className="text-[10px] text-amber-500 font-medium">Low stock</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
