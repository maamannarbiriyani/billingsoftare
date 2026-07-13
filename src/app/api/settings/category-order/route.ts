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
    const { order } = body;

    if (!order || !Array.isArray(order)) {
      return NextResponse.json(
        { error: "Invalid payload. Expected { order: string[] }" },
        { status: 400 }
      );
    }

    const categoryOrder = JSON.stringify(order);
    const existing = await prisma.setting.findFirst({ where: { branchId } });

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { categoryOrder },
      });
    } else {
      await prisma.setting.create({
        data: { branchId, categoryOrder },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update category order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
