import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { error: "Database file not found" },
        { status: 404 },
      );
    }

    const fileBuffer = fs.readFileSync(dbPath);

    const response = new NextResponse(fileBuffer);
    response.headers.set("Content-Type", "application/vnd.sqlite3");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.sqlite"`,
    );

    return response;
  } catch (error) {
    console.error("Backup Error:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 },
    );
  }
}
