import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit, Package, Plus, Tag, Hash } from "lucide-react";
import { Search } from "@/components/Search";
import { Pagination } from "@/components/Pagination";
import { DeleteProductButton } from "@/components/DeleteProductButton";
import { requireAdmin, getActiveBranchId } from "@/lib/auth";
import { BulkImportButton } from "./BulkImportButton";
import { Suspense } from "react";
import { CategoryFilter } from "@/components/CategoryFilter";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string; category?: string }>;
}) {
  await requireAdmin();
  const branchId = await getActiveBranchId();
  if (!branchId) return <div>No active branch selected.</div>;

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query || "";
  const category = resolvedSearchParams?.category || "";
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const itemsPerPage = 10;
  const skip = (currentPage - 1) * itemsPerPage;

  const whereClause: any = { AND: [{ isActive: true }, { branchId }] };
  if (query) {
    whereClause.AND.push({ OR: [{ name: { contains: query } }, { barcode: { contains: query } }] });
  }
  if (category) {
    whereClause.AND.push({ category });
  }
  if (whereClause.AND.length === 0) {
    delete whereClause.AND;
  }

  const [totalProducts, products, categoriesRaw] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      skip,
      take: itemsPerPage,
      orderBy: { id: "desc" },
    }),
    prisma.product.findMany({ select: { category: true }, distinct: ['category'] })
  ]);

  const categories = categoriesRaw.map(c => c.category).filter(Boolean) as string[];

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle mt-1">
            {totalProducts.toLocaleString()} products in your inventory
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <BulkImportButton />
          <Link
            href="/products/new"
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-full sm:max-w-xs">
          <Suspense fallback={<div className="h-10 w-full animate-pulse bg-secondary rounded-xl" />}>
            <Search placeholder="Search products or barcode..." />
          </Suspense>
        </div>
        <Suspense fallback={<div className="h-10 w-32 animate-pulse bg-secondary rounded-xl" />}>
          <CategoryFilter categories={categories} />
        </Suspense>
        {(query || category) && (
          <p className="text-sm text-muted-foreground">
            Showing results {query && <span>for <span className="font-semibold text-foreground/90">&quot;{query}&quot;</span></span>}
            {category && <span> in category <span className="font-semibold text-foreground/90">{category}</span></span>}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Stock</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                        <Package className="h-7 w-7 text-muted-foreground/80" />
                      </div>
                      <p className="font-semibold text-muted-foreground">No products found</p>
                      <p className="text-sm mt-1">
                        {query ? "Try a different search term" : "Add your first product to get started"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">{product.name}</span>
                      </div>
                    </td>
                    <td>
                      {product.barcode ? (
                        <span className="font-mono text-xs bg-secondary px-2 py-1 rounded-md text-muted-foreground">{product.barcode}</span>
                      ) : (
                        <span className="text-muted-foreground/80 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      {product.category ? (
                        <span className="badge badge-purple">
                          <Tag className="h-3 w-3" />
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/80 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className="font-semibold text-muted-foreground">₹{product.costPrice.toFixed(2)}</span>
                    </td>
                    <td>
                      <span className="font-bold text-foreground">₹{product.price.toFixed(2)}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          product.stock === 999999
                            ? "bg-secondary text-muted-foreground border border-border"
                            : product.stock === 0
                            ? "badge-danger"
                            : product.stock < 10
                            ? "badge-warning"
                            : "badge-success"
                        }`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${product.stock === 999999 ? "bg-slate-400" : product.stock === 0 ? "bg-red-500" : product.stock < 10 ? "bg-amber-500" : "bg-green-500"}`} />
                        {product.stock === 999999 ? "Not tracked" : product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="btn btn-ghost btn-sm"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <div className="btn btn-sm" style={{ padding: 0 }}>
                          <DeleteProductButton id={product.id} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Suspense fallback={<div className="h-10 w-48 animate-pulse bg-secondary rounded-xl" />}>
            <Pagination totalPages={totalPages} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
