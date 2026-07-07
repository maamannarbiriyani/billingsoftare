"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { getActiveBranchId } from "@/lib/auth";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  let barcode = formData.get("barcode") as string;
  const price = parseFloat(formData.get("price") as string);
  const costPrice = parseFloat(formData.get("costPrice") as string) || 0;
  const gstRate = parseFloat(formData.get("gstRate") as string) || 0;
  const stock = parseInt(formData.get("stock") as string, 10);
  const category = (formData.get("category") as string) || null;
  const unit = (formData.get("unit") as string) || "pcs";
  const hsnCode = (formData.get("hsnCode") as string) || null;
  const imageFile = formData.get("image") as File | null;

  if (!name || isNaN(price) || isNaN(stock)) {
    return { error: "Name, valid Price, and valid Stock are required." };
  }

  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  if (!barcode) {
    let candidate = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      candidate = `BAR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const exists = await prisma.product.findUnique({ where: { barcode: candidate } });
      if (!exists) { barcode = candidate; break; }
    }
    if (!barcode) barcode = `BAR-${Date.now()}`;
  }

  let imageUrl = null;
  if (imageFile && imageFile.size > 0) {
    try {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = join(process.cwd(), "public/uploads/products");
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      const uniqueName = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
      const path = join(uploadDir, uniqueName);
      await writeFile(path, buffer);
      imageUrl = `/uploads/products/${uniqueName}`;
    } catch {
      // Filesystem is read-only in production (Vercel) — skip image upload
    }
  }

  try {
    await prisma.product.create({
      data: {
        name,
        barcode,
        price,
        costPrice,
        gstRate,
        stock,
        category,
        unit,
        hsnCode,
        imageUrl,
        branchId,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A product with this barcode already exists." };
    }
    return { error: "Failed to create product." };
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const barcode = formData.get("barcode") as string;
  const price = parseFloat(formData.get("price") as string);
  const costPrice = parseFloat(formData.get("costPrice") as string) || 0;
  const gstRate = parseFloat(formData.get("gstRate") as string) || 0;
  const stock = parseInt(formData.get("stock") as string, 10);
  const category = (formData.get("category") as string) || null;
  const unit = (formData.get("unit") as string) || "pcs";
  const hsnCode = (formData.get("hsnCode") as string) || null;
  const imageFile = formData.get("image") as File | null;

  if (!name || !barcode || isNaN(price) || isNaN(stock)) {
    return {
      error: "Name, Barcode, valid Price, and valid Stock are required.",
    };
  }

  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  let imageUrl = undefined;
  if (imageFile && imageFile.size > 0) {
    try {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = join(process.cwd(), "public/uploads/products");
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      const uniqueName = `${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
      const path = join(uploadDir, uniqueName);
      await writeFile(path, buffer);
      imageUrl = `/uploads/products/${uniqueName}`;
    } catch {
      // Filesystem is read-only in production (Vercel) — skip image upload
    }
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (product?.branchId !== branchId) return { error: "Product not found" };

    const updateData: Record<string, unknown> = {
      name,
      barcode,
      price,
      costPrice,
      gstRate,
      stock,
      category,
      unit,
      hsnCode,
    };
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
    }

    await prisma.product.update({
      where: { id },
      data: updateData,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "A product with this barcode already exists." };
    }
    return { error: "Failed to update product." };
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: number) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (product?.branchId !== branchId) return { error: "Product not found" };

    // Hard-delete only if the product has never been referenced. If it has been
    // used in invoices/orders/purchases, archive it instead so the historical
    // records stay intact but it disappears from billing and the product list.
    const [invoiceItems, orderItems, purchaseItems, recipeItems] = await Promise.all([
      prisma.invoiceItem.count({ where: { productId: id } }),
      prisma.orderItem.count({ where: { productId: id } }),
      prisma.purchaseItem.count({ where: { productId: id } }),
      prisma.recipeItem.count({ where: { productId: id } }),
    ]);
    const isReferenced = invoiceItems + orderItems + purchaseItems + recipeItems > 0;

    if (isReferenced) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      revalidatePath("/products");
      revalidatePath("/billing");
      revalidatePath("/inventory");
      return { success: true, archived: true };
    }

    await prisma.product.delete({ where: { id } });
    revalidatePath("/products");
    revalidatePath("/billing");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    // Fallback: any remaining FK conflict -> archive instead of hard failing.
    if (error.code === "P2003") {
      try {
        await prisma.product.update({ where: { id }, data: { isActive: false } });
        revalidatePath("/products");
        revalidatePath("/billing");
        revalidatePath("/inventory");
        return { success: true, archived: true };
      } catch {
        return { error: "Cannot delete or archive this product." };
      }
    }
    return { error: "Failed to delete product." };
  }
}

export type BulkProductInput = {
  name: string;
  barcode: string;
  price: number;
  costPrice?: number;
  stock: number;
  category: string;
};

export async function bulkImportProducts(products: BulkProductInput[]) {
  if (!products || products.length === 0) {
    return { error: "No valid products to import." };
  }
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    let importedCount = 0;
    
    // We do this in a transaction, using upsert to avoid duplicate barcode errors
    await prisma.$transaction(async (tx) => {
      for (const p of products) {
        // Basic validation
        if (!p.name || isNaN(p.price) || isNaN(p.stock)) continue;
        
        let finalBarcode = p.barcode?.trim() || "";
        if (!finalBarcode) {
          // Unique barcode: timestamp + random suffix guarantees uniqueness within a batch
          finalBarcode = `BAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        }
        
        const existing = await tx.product.findUnique({ where: { barcode: finalBarcode } });
        
        if (existing) {
          if (existing.branchId !== branchId) {
            // Belongs to another branch - we cannot update it.
            // Generate a unique barcode for this branch's copy.
            finalBarcode = `BAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await tx.product.create({
              data: {
                name: p.name,
                barcode: finalBarcode,
                price: p.price,
                costPrice: p.costPrice || 0,
                stock: p.stock,
                category: p.category || null,
                branchId,
              }
            });
            importedCount++;
          } else {
            // Belongs to this branch - safe to update
            await tx.product.update({
              where: { id: existing.id },
              data: {
                name: p.name,
                price: p.price,
                costPrice: p.costPrice || 0,
                stock: { increment: p.stock },
                category: p.category || null,
              }
            });
            importedCount++;
          }
        } else {
          // Does not exist - safe to create
          await tx.product.create({
            data: {
              name: p.name,
              barcode: finalBarcode,
              price: p.price,
              costPrice: p.costPrice || 0,
              stock: p.stock,
              category: p.category || null,
              branchId,
            }
          });
          importedCount++;
        }
      }
    });

    revalidatePath("/products");
    revalidatePath("/billing");
    revalidatePath("/inventory");
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error("Bulk Import Error:", error);
    return { error: "Failed to perform bulk import." };
  }
}

export async function updateProductOrder(updates: { id: number; display_order: number }[]) {
  const branchId = await getActiveBranchId();
  if (!branchId) return { error: "No active branch" };

  try {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.product.update({
          where: { id: update.id, branchId },
          data: { display_order: update.display_order },
        })
      )
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to update product order:", error);
    return { error: "Failed to update product order" };
  }
}

