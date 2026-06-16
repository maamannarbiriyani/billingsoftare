import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function addRecipeItem(formData: FormData) {
  "use server";
  const productId = parseInt(formData.get("productId") as string);
  const ingredientId = parseInt(formData.get("ingredientId") as string);
  const quantityUsed = parseFloat(formData.get("quantityUsed") as string);

  await prisma.recipeItem.create({
    data: { productId, ingredientId, quantityUsed }
  });
  revalidatePath("/raw-inventory/recipes");
}

async function removeRecipeItem(formData: FormData) {
  "use server";
  const id = parseInt(formData.get("id") as string);
  await prisma.recipeItem.delete({ where: { id } });
  revalidatePath("/raw-inventory/recipes");
}

export default async function RecipeManagement({ searchParams }: { searchParams: { productId?: string } }) {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });

  const selectedProductId = searchParams.productId ? parseInt(searchParams.productId) : (products[0]?.id || null);

  const selectedProduct = selectedProductId ? await prisma.product.findUnique({
    where: { id: selectedProductId },
    include: {
      recipeItems: {
        include: { ingredient: true }
      }
    }
  }) : null;

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Recipe Management (BOM)</h1>
        <a href="/raw-inventory" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition">
          &larr; Back to Inventory
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden h-fit">
          <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-700">
            Menu Items
          </div>
          <ul className="max-h-[600px] overflow-y-auto">
            {products.map(p => (
              <li key={p.id}>
                <a 
                  href={`/raw-inventory/recipes?productId=${p.id}`}
                  className={`block px-4 py-3 border-b border-slate-100 hover:bg-indigo-50 transition ${selectedProductId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-500 font-medium text-indigo-700' : 'text-slate-600'}`}
                >
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-3">
          {selectedProduct ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-2">{selectedProduct.name} Recipe</h2>
              <p className="text-slate-500 mb-6">Selling Price: ₹{selectedProduct.price} | Map the raw ingredients needed to make 1 unit of this item.</p>

              <div className="mb-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-slate-500">
                      <th className="py-2 px-3">Ingredient</th>
                      <th className="py-2 px-3">Quantity Used</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.recipeItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 italic">No ingredients mapped yet.</td>
                      </tr>
                    ) : (
                      selectedProduct.recipeItems.map(ri => (
                        <tr key={ri.id} className="border-b border-slate-50">
                          <td className="py-3 px-3 font-medium">{ri.ingredient.name}</td>
                          <td className="py-3 px-3 text-blue-600 font-medium">{ri.quantityUsed} {ri.ingredient.unit}</td>
                          <td className="py-3 px-3 text-right text-slate-600">₹{(ri.quantityUsed * ri.ingredient.costPerUnit).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right">
                            <form action={removeRecipeItem}>
                              <input type="hidden" name="id" value={ri.id} />
                              <button type="submit" className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                    {selectedProduct.recipeItems.length > 0 && (
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={2} className="py-3 px-3 text-right text-slate-700">Total Raw Material Cost:</td>
                        <td className="py-3 px-3 text-right text-red-600">
                          ₹{selectedProduct.recipeItems.reduce((acc, ri) => acc + (ri.quantityUsed * ri.ingredient.costPerUnit), 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-3">Add Ingredient to Recipe</h3>
                <form action={addRecipeItem} className="flex gap-4 items-end">
                  <input type="hidden" name="productId" value={selectedProduct.id} />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ingredient</label>
                    <select name="ingredientId" required className="w-full border rounded px-3 py-2 bg-white">
                      <option value="">Select ingredient...</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Qty Used</label>
                    <input name="quantityUsed" type="number" step="0.01" required className="w-full border rounded px-3 py-2" placeholder="e.g. 150" />
                  </div>
                  <button type="submit" className="bg-indigo-600 text-white font-medium px-6 py-2 rounded hover:bg-indigo-500 transition">
                    Add
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 bg-white border border-slate-200 rounded-xl">
              Select a product from the list to manage its recipe.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
