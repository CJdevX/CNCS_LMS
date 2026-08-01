import { makeDriveFilePublic, resolveFileCategory } from "@/services/drive.service";
import dbConnect from "@/lib/database";
import Subject from "@/models/Subject";
import File from "@/models/File";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      fileId,
      filename,
      mimeType,
      fileSize,
      subject,
      isAssignment,
      uploadedBy,
      storageType,
    } = body;

    if (!fileId) {
      return NextResponse.json({ success: false, message: "File ID is required" }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    }

    // ── Get or create subject in MongoDB ──────────────────────────────────────
    const subjectDoc = await Subject.findOneAndUpdate(
      { name: subject.trim() },
      { $setOnInsert: { name: subject.trim() } },
      { upsert: true, returnDocument: "after" }
    );

    const { category, type } = resolveFileCategory(mimeType || "", filename, isAssignment || false);

    let createdFile;

    if (storageType === "YOUTUBE") {
      const youtubeUrl = `https://www.youtube.com/watch?v=${fileId}`;
      createdFile = await File.create({
        drive_file_id: fileId,
        drive_url: youtubeUrl,
        name: filename,
        category: "Videos",
        type: "Video",
        subject_id: subjectDoc._id,
        uploaded_by: (uploadedBy || "unknown").toLowerCase().trim(),
        size_bytes: fileSize || 0,
        storage_type: "YOUTUBE",
        google_drive_id: null,
        youtube_url: youtubeUrl,
      });
    } else {
      // Make drive file public so students can view/download
      try {
        await makeDriveFilePublic(fileId);
      } catch (permErr) {
        console.warn("[Drive Permission Warning]", permErr);
      }

      const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;

      createdFile = await File.create({
        drive_file_id: fileId,
        drive_url: driveUrl,
        name: filename,
        category,
        type,
        subject_id: subjectDoc._id,
        uploaded_by: (uploadedBy || "unknown").toLowerCase().trim(),
        size_bytes: fileSize || 0,
        storage_type: "GOOGLE_DRIVE",
        google_drive_id: fileId,
        youtube_url: null,
      });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: createdFile._id.toString(),
        storageType: createdFile.storage_type,
        name: createdFile.name,
        category: createdFile.category,
        type: createdFile.type,
        subject: subjectDoc.name,
      },
    });
  } catch (error) {
    console.error("[Upload Complete API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record upload in database." },
      { status: 500 }
    );
  }
}
