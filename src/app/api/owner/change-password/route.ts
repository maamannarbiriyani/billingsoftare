import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerSession } from "@/lib/owner-auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getOwnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { current, newPassword } = await req.json();
  if (!current || !newPassword) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (newPassword.length < 6) return NextResponse.json({ error: "Password too short" }, { status: 400 });

  const account = await prisma.ownerAccount.findUnique({ where: { username: session.username } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const valid = await bcrypt.compare(current, account.password);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.ownerAccount.update({ where: { id: account.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
