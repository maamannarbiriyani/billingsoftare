import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function addIngredient(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const currentStock = parseFloat(formData.get("currentStock") as string);
  const costPerUnit = parseFloat(formData.get("costPerUnit") as string);

  await prisma.ingredient.create({
    data: { name, unit, currentStock, costPerUnit }
  });
  revalidatePath("/raw-inventory");
}

export default async function InventoryDashboard() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { currentStock: "asc" }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Raw Inventory Management</h1>
        <a href="/raw-inventory/recipes" className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition">
          Manage Recipes (BOM) &rarr;
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-xl font-bold mb-4">Add Raw Material</h2>
          <form action={addIngredient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Ingredient Name</label>
              <input name="name" required className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="e.g. Paneer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Unit</label>
              <select name="unit" className="mt-1 w-full border rounded-lg px-3 py-2 bg-white">
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="L">Liters (L)</option>
                <option value="pcs">Pieces (pcs)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Initial Stock</label>
              <input name="currentStock" type="number" step="0.01" required className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="e.g. 5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Cost Per Unit (₹)</label>
              <input name="costPerUnit" type="number" step="0.01" required className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="e.g. 0.40" />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-500 transition">
              Add Ingredient
            </button>
          </form>
        </div>

        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Current Stock Levels</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-100 text-slate-500">
                  <th className="py-3 px-4 font-semibold">Ingredient</th>
                  <th className="py-3 px-4 font-semibold">Current Stock</th>
                  <th className="py-3 px-4 font-semibold">Unit Cost</th>
                  <th className="py-3 px-4 font-semibold">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 italic">No ingredients added yet.</td>
                  </tr>
                ) : (
                  ingredients.map(ing => (
                    <tr key={ing.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{ing.name}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${ing.currentStock < 1000 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {ing.currentStock} {ing.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">₹{ing.costPerUnit.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">₹{(ing.currentStock * ing.costPerUnit).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
