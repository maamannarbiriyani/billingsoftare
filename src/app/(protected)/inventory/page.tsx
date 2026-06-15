import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AlertTriangle, Edit, Package, CheckCircle, TrendingDown, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const filter = params.filter || "all";
  const q = params.q || "";
  const UNLIMITED = 999999;
  const LOW_STOCK_THRESHOLD = 10;

  const allProducts = await prisma.product.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { barcode: { contains: q } }, { category: { contains: q } }] }
      : undefined,
    orderBy: { name: "asc" },
  });

  const filtered = allProducts.filter((p) => {
    if (filter === "out") return p.stock === 0;
    if (filter === "low") return p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD && p.stock !== UNLIMITED;
    if (filter === "ok") return p.stock > LOW_STOCK_THRESHOLD && p.stock !== UNLIMITED;
    if (filter === "unlimited") return p.stock === UNLIMITED;
    return true;
  });

  const outCount = allProducts.filter((p) => p.stock === 0).length;
  const lowCount = allProducts.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD && p.stock !== UNLIMITED).length;
  const okCount = allProducts.filter((p) => p.stock > LOW_STOCK_THRESHOLD && p.stock !== UNLIMITED).length;
  const unlimitedCount = allProducts.filter((p) => p.stock === UNLIMITED).length;

  const stockBadge = (stock: number) => {
    if (stock === UNLIMITED) return <span className="badge" style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}>Unlimited</span>;
    if (stock === 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (stock <= LOW_STOCK_THRESHOLD) return <span className="badge badge-warning">{stock} left</span>;
    return <span className="badge badge-success">{stock} in stock</span>;
  };

  const tabs = [
    { label: "All", value: "all", count: allProducts.length },
    { label: "Out of Stock", value: "out", count: outCount, danger: true },
    { label: "Low Stock", value: "low", count: lowCount, warn: true },
    { label: "OK", value: "ok", count: okCount },
    { label: "Unlimited", value: "unlimited", count: unlimitedCount },
  ];

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Header */}
      <div className="pb-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle mt-1">Monitor and manage stock levels across all products</p>
        </div>
        <div className="flex gap-2">
          {outCount > 0 && (
            <span className="badge badge-danger text-sm px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {outCount} out of stock
            </span>
          )}
          {lowCount > 0 && (
            <span className="badge badge-warning text-sm px-3 py-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              {lowCount} low
            </span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Out of Stock", count: outCount, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "Low Stock (≤10)", count: lowCount, icon: TrendingDown, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Well Stocked", count: okCount, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Total Products", count: allProducts.length, icon: Package, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        ].map((s) => (
          <div key={s.label} className="stat-card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">{s.count}</p>
              <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`?filter=${tab.value}${q ? `&q=${q}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.value ? "bg-white/20" : "bg-border"
              }`}>
                {tab.count}
              </span>
            </Link>
          ))}
        </div>
        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products..."
            className="input-field pl-9 py-1.5 text-sm w-60"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Unit</th>
                <th>HSN Code</th>
                <th>Cost Price</th>
                <th>Sell Price</th>
                <th>GST</th>
                <th>Stock Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground/90 mt-3">No products found</p>
                      <p className="text-sm mt-1">Try a different filter or search term.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-semibold text-foreground">{product.name}</span>
                      </div>
                    </td>
                    <td>
                      {product.barcode ? (
                        <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md text-muted-foreground">{product.barcode}</span>
                      ) : <span className="text-muted-foreground/60 text-xs">—</span>}
                    </td>
                    <td>
                      {product.category ? <span className="badge badge-default">{product.category}</span> : <span className="text-muted-foreground/60 text-xs">—</span>}
                    </td>
                    <td className="text-sm text-muted-foreground">{(product as any).unit || "pcs"}</td>
                    <td className="text-sm text-muted-foreground font-mono">{(product as any).hsnCode || <span className="text-muted-foreground/60 text-xs">—</span>}</td>
                    <td className="font-semibold text-foreground">₹{product.costPrice.toFixed(2)}</td>
                    <td className="font-bold text-foreground">₹{product.price.toFixed(2)}</td>
                    <td className="text-sm text-muted-foreground">{product.gstRate > 0 ? `${product.gstRate}%` : "Exempt"}</td>
                    <td>{stockBadge(product.stock)}</td>
                    <td>
                      <Link href={`/products/${product.id}/edit`} className="btn btn-secondary btn-sm">
                        <Edit className="h-3.5 w-3.5" />
                        Edit / Restock
                      </Link>
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
