import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Backup is not available for cloud database deployments. Use the Supabase dashboard to export your data." },
    { status: 400 }
  );
}
