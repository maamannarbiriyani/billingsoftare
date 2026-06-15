import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validate payload (Basic validation)
    if (!data.source || !data.externalId || !data.items || !Array.isArray(data.items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Check if order already exists to prevent duplicates
    const existingOrder = await prisma.order.findUnique({
      where: { externalId: data.externalId },
    });

    if (existingOrder) {
      return NextResponse.json({ message: "Order already exists" }, { status: 200 });
    }

    // Process items. 
    // In a real scenario, you'd match the aggregator's item IDs to your POS Product IDs.
    // Here we'll try to find the product by name, or use a default fallback (if needed).
    const orderItemsData = [];
    for (const item of data.items) {
      // Find product by name
      let product = await prisma.product.findFirst({
        where: { name: item.name },
      });

      // If the product doesn't exist in our DB, we'll create a dummy one for the demo
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: item.name,
            price: item.price,
            category: "Aggregator Items",
          },
        });
      }

      orderItemsData.push({
        productId: product.id,
        qty: item.qty,
        price: item.price,
        notes: item.notes || null,
      });
    }

    // Create the order in the database
    const newOrder = await prisma.order.create({
      data: {
        source: data.source, // e.g., "SWIGGY", "ZOMATO"
        externalId: data.externalId,
        status: "RECEIVED", // Initial state for KDS
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // In a real application, you might trigger a WebSocket or Pusher event here to update the KDS UI in real-time.
    console.log(`[Webhook] Received new ${data.source} order: ${data.externalId}`);

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error("[Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
