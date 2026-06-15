import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, source, items } = body;

    if (!orderId || !source || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Ensure we don't duplicate orders
    const existingOrder = await prisma.order.findUnique({
      where: { externalId: orderId },
    });
    if (existingOrder) {
      return NextResponse.json({ error: "Order already exists" }, { status: 409 });
    }

    // Prepare items by matching with internal products
    const orderItemsData = [];
    for (const item of items) {
      let product = await prisma.product.findFirst({
        where: { name: { equals: item.name } },
      });

      // Fallback: Create product if missing
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: `${item.name} (Online)`,
            price: item.price,
            category: source,
          },
        });
      }

      orderItemsData.push({
        productId: product.id,
        qty: item.qty,
        price: item.price,
        costPrice: product.costPrice,
        notes: item.notes || "",
      });
    }

    // Create the Order
    const newOrder = await prisma.order.create({
      data: {
        source: source.toUpperCase(),
        externalId: orderId,
        status: "RECEIVED",
        items: {
          create: orderItemsData,
        },
      },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
