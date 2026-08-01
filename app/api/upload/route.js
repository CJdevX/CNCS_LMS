import drive, { resolveDrivePath, resolveFileCategory } from "@/services/drive.service";
import { uploadVideo } from "@/services/youtube.service";
import dbConnect from "@/lib/database";
import Subject from "@/models/Subject";
import File from "@/models/File";
import { NextResponse } from "next/server";
import { Readable } from "stream";

export async function POST(request) {
  try {
    await dbConnect();
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
    const { category, type } = resolveFileCategory(mimeType, file.name, isAssign);
    const fileSize = file.size || 0;
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Determine Storage Destination ──────────────────────────────────────────
    const isVideoFile = mimeType.startsWith("video/") || /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v|3gp|ts)$/i.test(file.name);
    const storageType = isVideoFile ? "YOUTUBE" : "GOOGLE_DRIVE";

    // ── Get or create subject in MongoDB ──────────────────────────────────────
    const subjectDoc = await Subject.findOneAndUpdate(
      { name: subject.trim() },
      { $setOnInsert: { name: subject.trim() } },
      { upsert: true, returnDocument: "after" }
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

      // ── Step 2: Save YouTube metadata to MongoDB ───────────────────────────
      const createdFile = await File.create({
        drive_file_id: youtubeResult.videoId,
        drive_url: youtubeResult.videoUrl,
        name: file.name,
        category: "Videos",
        type: "Video",
        subject_id: subjectDoc._id,
        uploaded_by: uploadedBy.toLowerCase().trim(),
        size_bytes: fileSize,
        storage_type: "YOUTUBE",
        google_drive_id: null,
        youtube_url: youtubeResult.videoUrl,
      });

      fileRecordId = createdFile._id.toString();
      responseFileData = {
        id: fileRecordId,
        storageType: "YOUTUBE",
        videoId: youtubeResult.videoId,
        youtubeUrl: youtubeResult.videoUrl,
        name: file.name,
        category: "Videos",
        type: "Video",
        subject: subjectDoc.name,
      };

    } else {
      // ── Step 1: Resolve Drive path & upload to Google Drive ────────────────
      const targetFolderId = await resolveDrivePath(mimeType, file.name, isAssign, subject);

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

      // ── Step 2: Save Drive metadata to MongoDB ────────────────────────────
      const createdFile = await File.create({
        drive_file_id: driveFile.id,
        drive_url: driveFile.webViewLink || "",
        name: file.name,
        category,
        type,
        subject_id: subjectDoc._id,
        uploaded_by: uploadedBy.toLowerCase().trim(),
        size_bytes: parseInt(driveFile.size || fileSize.toString()),
        storage_type: "GOOGLE_DRIVE",
        google_drive_id: driveFile.id,
        youtube_url: null,
      });

      fileRecordId = createdFile._id.toString();
      responseFileData = {
        id: fileRecordId,
        storageType: "GOOGLE_DRIVE",
        driveId: driveFile.id,
        driveUrl: driveFile.webViewLink,
        name: file.name,
        category,
        type,
        subject: subjectDoc.name,
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
    message: "Upload API — POST with FormData: file, subject, isAssignment, uploadedBy, sharedWith",
  });
}
