import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Restore is not available for cloud database deployments. Use the Supabase dashboard to manage your data." },
    { status: 400 }
  );
}
