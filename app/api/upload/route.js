import { createDriveResumableSession, resolveFileCategory } from "@/services/drive.service";
import { createYouTubeResumableSession } from "@/services/youtube.service";
import dbConnect from "@/lib/database";
import Subject from "@/models/Subject";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      filename,
      mimeType,
      fileSize,
      subject,
      isAssignment,
      uploadedBy,
      storageType: requestedStorage,
    } = body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!filename) {
      return NextResponse.json({ success: false, message: "Filename is required" }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    }

    const isVideoFile =
      (mimeType || "").startsWith("video/") ||
      /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v|3gp|ts)$/i.test(filename);
    const storageType = requestedStorage || (isVideoFile ? "YOUTUBE" : "GOOGLE_DRIVE");
    const { category, type } = resolveFileCategory(mimeType || "", filename, isAssignment || false);

    // ── Get or create subject in MongoDB ──────────────────────────────────────
    const subjectDoc = await Subject.findOneAndUpdate(
      { name: subject.trim() },
      { $setOnInsert: { name: subject.trim() } },
      { upsert: true, returnDocument: "after" }
    );

    let uploadUrl = "";

    if (storageType === "YOUTUBE") {
      uploadUrl = await createYouTubeResumableSession({
        title: filename.replace(/\.[^/.]+$/, ""),
        description: `LMS Lecture Video (${subject}) — Uploaded by ${uploadedBy || "unknown"}`,
        mimeType: mimeType || "video/mp4",
        fileSize: fileSize || 0,
        privacyStatus: "unlisted",
        tags: ["LMS", subject],
      });
    } else {
      const sessionResult = await createDriveResumableSession(
        mimeType || "application/octet-stream",
        filename,
        fileSize || 0,
        isAssignment || false,
        subject
      );
      uploadUrl = sessionResult.uploadUrl;
    }

    return NextResponse.json({
      success: true,
      uploadUrl,
      storageType,
      subject: subjectDoc.name,
      subjectId: subjectDoc._id,
      category,
      type,
    });
  } catch (error) {
    console.error("[Upload Init API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize upload session." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Upload API — POST JSON: filename, mimeType, fileSize, subject, isAssignment, uploadedBy, storageType to get a direct upload session URL.",
  });
}
