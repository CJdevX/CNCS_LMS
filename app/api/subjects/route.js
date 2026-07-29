import db from "@/lib/database";
import { NextResponse } from "next/server";

/**
 * GET  /api/subjects  → list all subjects
 * POST /api/subjects  → { name: "..." } → add a new subject
 */

export async function GET() {
  try {
    const [rows] = await db.execute(
      "SELECT id, name, created_at FROM subjects ORDER BY name ASC"
    );
    return NextResponse.json({ success: true, subjects: rows });
  } catch (error) {
    console.error("[Subjects GET Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Subject name is required" }, { status: 400 });
    }

    await db.execute("INSERT IGNORE INTO subjects (name) VALUES (?)", [name]);
    const [[row]] = await db.execute("SELECT id, name FROM subjects WHERE name = ?", [name]);

    return NextResponse.json({ success: true, subject: row });
  } catch (error) {
    console.error("[Subjects POST Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
