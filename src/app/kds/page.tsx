import { prisma } from "@/lib/prisma";
import { Clock, CheckCircle, ChefHat } from "lucide-react";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getActiveBranchId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server action to mark order as PREPARING
async function markPreparing(orderId: number) {
  "use server";
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PREPARING" }
  });
  revalidatePath("/kds");
}

// Server action to mark order as READY and deduct inventory
async function markReady(orderId: number) {
  "use server";
  
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: { recipeItems: true }
          }
        }
      }
    }
  });

  if (order && order.status !== "READY") {
    // Deduct stock based on BOM/Recipes
    for (const item of order.items) {
      if (!item.product.recipeItems) continue;
      
      for (const recipeItem of item.product.recipeItems) {
        const totalAmountToDeduct = recipeItem.quantityUsed * item.qty;
        await prisma.ingredient.update({
          where: { id: recipeItem.ingredientId },
          data: { currentStock: { decrement: totalAmountToDeduct } }
        });
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "READY" }
    });
  }

  revalidatePath("/kds");
}

export default async function KitchenDisplaySystem() {
  headers(); // force dynamic — prevents static prerender
  const branchId = await getActiveBranchId();
  if (!branchId) return <div>No active branch selected.</div>;

  const activeOrders = await prisma.order.findMany({
    where: {
      branchId,
      status: { in: ["RECEIVED", "PREPARING"] }
    },
    include: {
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-6 font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-orange-500">
          <ChefHat className="h-8 w-8" />
          Kitchen Display System (KDS)
        </h1>
        <div className="text-neutral-400 font-medium">
          {activeOrders.length} Active Orders
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeOrders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-64 text-neutral-500">
            <CheckCircle className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-xl">Kitchen is clear. Great job!</p>
          </div>
        ) : (
          activeOrders.map(order => {
            const isPreparing = order.status === "PREPARING";
            const waitTime = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            
            // Color logic based on wait time and source
            let borderColor = "border-neutral-700";
            if (waitTime >= 15) borderColor = "border-red-500";
            else if (waitTime >= 10) borderColor = "border-yellow-500";
            else if (order.source === "SWIGGY") borderColor = "border-orange-500";
            else if (order.source === "ZOMATO") borderColor = "border-red-600";

            return (
              <div key={order.id} className={`bg-neutral-800 rounded-xl border-t-4 shadow-lg overflow-hidden flex flex-col ${borderColor}`}>
                <div className="p-4 bg-neutral-800/50 border-b border-neutral-700 flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-xl">Order #{order.id}</h2>
                    <span className={`text-xs font-bold px-2 py-1 rounded mt-1 inline-block ${order.source === 'DINE_IN' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {order.source}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 font-mono font-bold ${waitTime >= 15 ? 'text-red-400' : 'text-neutral-400'}`}>
                    <Clock className="h-4 w-4" />
                    {waitTime}m
                  </div>
                </div>

                <div className="p-4 flex-1">
                  <ul className="space-y-3">
                    {order.items.map(item => (
                      <li key={item.id} className="text-lg flex justify-between items-start border-b border-neutral-700/50 pb-2 last:border-0">
                        <div className="font-medium text-neutral-200">
                          <span className="font-bold mr-2 text-neutral-400">{item.qty}x</span>
                          {item.product.name}
                          {item.notes && (
                            <p className="text-sm text-yellow-500 mt-1 italic">Note: {item.notes}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-neutral-900 border-t border-neutral-700">
                  {!isPreparing ? (
                    <form action={markPreparing.bind(null, order.id)}>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition text-lg">
                        Start Preparing
                      </button>
                    </form>
                  ) : (
                    <form action={markReady.bind(null, order.id)}>
                      <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition text-lg">
                        Mark Ready
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
