import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const branchId = await getActiveBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid payload. Expected { items: [{ id: number, display_order: number }] }" },
        { status: 400 }
      );
    }

    // Execute all updates in a single transaction
    await prisma.$transaction(
      items.map((item: any) =>
        prisma.product.update({
          where: { id: item.id, branchId },
          data: { display_order: item.display_order },
        })
      )
    );

    return NextResponse.json({ success: true, updatedCount: items.length });
  } catch (error) {
    console.error("Failed to update product order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
