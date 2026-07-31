import drive, { resolveDrivePath, resolveFileCategory } from "@/services/drive.service";
import { uploadVideo } from "@/services/youtube.service";
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
    const inputStorageType = formData.get("storageType"); // GOOGLE_DRIVE, YOUTUBE, or AUTO/undefined

    // ── Validation ────────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const { category, type } = resolveFileCategory(mimeType, isAssign);
    const fileSize = file.size || 0;
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Determine Storage Destination ──────────────────────────────────────────
    let storageType = inputStorageType || "GOOGLE_DRIVE";
    const youtubeThresholdMB = parseInt(process.env.YOUTUBE_VIDEO_SIZE_MB || "100", 10) || 100;
    const youtubeThresholdBytes = youtubeThresholdMB * 1024 * 1024;

    const isVideoFile = mimeType.startsWith("video/") || /\.(mp4|mkv|avi|mov|webm)$/i.test(file.name);
    if (!inputStorageType || inputStorageType === "AUTO") {
      if (isVideoFile && fileSize >= youtubeThresholdBytes) {
        storageType = "YOUTUBE";
      } else {
        storageType = "GOOGLE_DRIVE";
      }
    }

    // ── Get or create subject_id from DB ─────────────────────────────────────
    await db.execute(
      "INSERT IGNORE INTO subjects (name) VALUES (?)",
      [subject]
    );
    const [[subjectRow]] = await db.execute(
      "SELECT id FROM subjects WHERE name = ?",
      [subject]
    );

    let fileRecordId = null;
    let responseFileData = null;

    if (storageType === "YOUTUBE") {
      // ── Step 1: Upload to YouTube ──────────────────────────────────────────
      const youtubeResult = await uploadVideo({
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: `LMS Lecture Video (${subject}) — Uploaded by ${uploadedBy}`,
        fileStream: Readable.from(buffer),
        privacyStatus: "unlisted",
        tags: ["LMS", subject],
      });

      // ── Step 2: Save YouTube metadata to MySQL ──────────────────────────────
      const [insertResult] = await db.execute(
        `INSERT INTO lms_files
          (drive_file_id, drive_url, name, category, type, subject_id, uploaded_by, size_bytes, storage_type, google_drive_id, youtube_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'YOUTUBE', NULL, ?)`,
        [
          youtubeResult.videoId,
          youtubeResult.videoUrl,
          file.name,
          "Videos",
          "Video",
          subjectRow.id,
          uploadedBy,
          fileSize,
          youtubeResult.videoUrl,
        ]
      );

      fileRecordId = insertResult.insertId;
      responseFileData = {
        id: fileRecordId,
        storageType: "YOUTUBE",
        videoId: youtubeResult.videoId,
        youtubeUrl: youtubeResult.videoUrl,
        name: file.name,
        category: "Videos",
        type: "Video",
        subject,
      };

    } else {
      // ── Step 1: Resolve Drive path & upload to Google Drive ────────────────
      const targetFolderId = await resolveDrivePath(mimeType, isAssign, subject);

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

      // ── Step 2: Save Drive metadata to MySQL ───────────────────────────────
      const [insertResult] = await db.execute(
        `INSERT INTO lms_files
          (drive_file_id, drive_url, name, category, type, subject_id, uploaded_by, size_bytes, storage_type, google_drive_id, youtube_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'GOOGLE_DRIVE', ?, NULL)`,
        [
          driveFile.id,
          driveFile.webViewLink || "",
          file.name,
          category,
          type,
          subjectRow.id,
          uploadedBy,
          parseInt(driveFile.size || fileSize.toString()),
          driveFile.id,
        ]
      );

      fileRecordId = insertResult.insertId;
      responseFileData = {
        id: fileRecordId,
        storageType: "GOOGLE_DRIVE",
        driveId: driveFile.id,
        driveUrl: driveFile.webViewLink,
        name: file.name,
        category,
        type,
        subject,
      };
    }

    return NextResponse.json({
      success: true,
      file: responseFileData,
    });

  } catch (error) {
    console.error("[Upload API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred during upload." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Upload API — POST with FormData: file, subject, isAssignment, uploadedBy, sharedWith, storageType (GOOGLE_DRIVE | YOUTUBE)",
  });
}
