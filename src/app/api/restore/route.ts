import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("db") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Verify it's a valid extension
    if (!file.name.endsWith(".sqlite") && !file.name.endsWith(".db")) {
      return NextResponse.json(
        { error: "Invalid file type. Must be .sqlite or .db" },
        { status: 400 },
      );
    }

    const dbPath = path.join(process.cwd(), "prisma", "dev.db");

    // Read the uploaded file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Overwrite the existing dev.db file
    fs.writeFileSync(dbPath, buffer);

    return NextResponse.json({
      success: true,
      message: "Database restored successfully",
    });
  } catch (error) {
    console.error("Restore Error:", error);
    return NextResponse.json(
      { error: "Failed to restore database" },
      { status: 500 },
    );
  }
}
