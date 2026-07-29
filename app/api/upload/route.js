import drive, { resolveDrivePath, resolveFileCategory } from "@/lib/googleDrive";
import db from "@/lib/database";
import { NextResponse } from "next/server";
import { Readable } from "stream";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const file        = formData.get("file");
    const subject     = formData.get("subject");
    const isAssign    = formData.get("isAssignment") === "true";
    const uploadedBy  = formData.get("uploadedBy") || "unknown";
    const sharedWith  = formData.get("sharedWith") || ""; // comma-separated emails

    // ── Validation ────────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const { category, type } = resolveFileCategory(mimeType, isAssign);

    // ── Step 1: Resolve Drive path (auto-creates folders if missing) ──────────
    const targetFolderId = await resolveDrivePath(mimeType, isAssign, subject);

    // ── Step 2: Upload file to Drive ─────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id, name, webViewLink, size",
    });

    const driveFile = driveResponse.data;

    // Make file readable by anyone with the link
    await drive.permissions.create({
      fileId: driveFile.id,
      requestBody: { role: "reader", type: "anyone" },
    });

    // ── Step 3: Get subject_id from DB ────────────────────────────────────────
    // Auto-create subject if it doesn't exist
    await db.execute(
      "INSERT IGNORE INTO subjects (name) VALUES (?)",
      [subject]
    );
    const [[subjectRow]] = await db.execute(
      "SELECT id FROM subjects WHERE name = ?",
      [subject]
    );

    // ── Step 4: Save file metadata to MySQL ───────────────────────────────────
    const [insertResult] = await db.execute(
      `INSERT INTO lms_files
        (drive_file_id, drive_url, name, category, type, subject_id, uploaded_by, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driveFile.id,
        driveFile.webViewLink || "",
        file.name,
        category,
        type,
        subjectRow.id,
        uploadedBy,
        parseInt(driveFile.size || "0"),
      ]
    );

    const newFileId = insertResult.insertId;

    // ── Step 5: Grant access to selected students ─────────────────────────────
    const emails = sharedWith
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length > 0) {
      const accessValues = emails.map((email) => [newFileId, email]);
      await db.query(
        "INSERT IGNORE INTO file_access (file_id, user_email) VALUES ?",
        [accessValues]
      );
    }

    return NextResponse.json({
      success: true,
      file: {
        id: newFileId,
        driveId: driveFile.id,
        name: file.name,
        category,
        type,
        subject,
        driveUrl: driveFile.webViewLink,
      },
    });

  } catch (error) {
    console.error("[Upload Error]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Upload API — POST with FormData: file, subject, isAssignment, uploadedBy, sharedWith",
  });
}
