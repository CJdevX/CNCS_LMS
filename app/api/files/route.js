import dbConnect from "@/lib/database";
import File from "@/lib/models/File";
import Subject from "@/lib/models/Subject";
import drive from "@/services/drive.service";
import { deleteVideo } from "@/services/youtube.service";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/files
 *
 * Query params (all optional, combinable):
 *   ?category=Documents          → all files in Documents (PDF+Word+PPT+Excel)
 *   ?type=PDF                    → only PDFs
 *   ?subject=Networking          → all file types tagged Networking
 *   ?userEmail=x@gmail.com       → files shared with this person
 *   ?type=Video&subject=Cloud    → videos in Cloud
 *   ?search=routing              → name search
 */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const category  = searchParams.get("category");
    const type      = searchParams.get("type");
    const subject   = searchParams.get("subject");
    const userEmail = searchParams.get("userEmail");
    const search    = searchParams.get("search");

    const queryFilter = {};

    // Filter by uploader email
    if (userEmail) {
      queryFilter.uploaded_by = userEmail.toLowerCase().trim();
    }

    if (category === "Others" || type === "Other") {
      queryFilter.$or = [{ category: "Others" }, { type: "Other" }];
    } else {
      if (category) queryFilter.category = category;
      if (type)     queryFilter.type = type;
    }

    if (subject) {
      const subjectDoc = await Subject.findOne({ name: subject.trim() });
      if (subjectDoc) {
        queryFilter.subject_id = subjectDoc._id;
      } else {
        // If subject name given doesn't exist, return empty array immediately
        return NextResponse.json({ success: true, count: 0, files: [] });
      }
    }

    if (search) {
      queryFilter.name = { $regex: search.trim(), $options: "i" };
    }

    const files = await File.find(queryFilter)
      .populate("subject_id", "name")
      .sort({ created_at: -1 })
      .lean();

    const formattedFiles = files.map((f) => ({
      id: f._id.toString(),
      drive_file_id: f.drive_file_id,
      drive_url: f.drive_url,
      name: f.name,
      category: f.category,
      type: f.type,
      uploaded_by: f.uploaded_by,
      size_bytes: f.size_bytes,
      storage_type: f.storage_type,
      google_drive_id: f.google_drive_id,
      youtube_url: f.youtube_url,
      created_at: f.created_at,
      subject: f.subject_id?.name || null,
    }));

    return NextResponse.json({ success: true, count: formattedFiles.length, files: formattedFiles });

  } catch (error) {
    console.error("[Files API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files?id=123
 *
 * Deletes a file uploaded by the currently authenticated user.
 * Removes external file from Google Drive or YouTube, and deletes DB records.
 */
export async function DELETE(request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("lms_session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    let currentUser;
    try {
      const sessionData = Buffer.from(sessionToken, "base64").toString("utf-8");
      currentUser = JSON.parse(sessionData);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid session token." }, { status: 401 });
    }

    if (!currentUser || !currentUser.email) {
      return NextResponse.json({ success: false, error: "Unauthorized user." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ success: false, error: "File ID is required." }, { status: 400 });
    }

    // Find file in database
    const file = await File.findById(fileId);

    if (!file) {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
    }

    // Ownership check: only uploader can delete
    if (file.uploaded_by?.trim().toLowerCase() !== currentUser.email?.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You can only delete files that you uploaded." },
        { status: 403 }
      );
    }

    // Delete from Google Drive or YouTube
    if (file.storage_type === "YOUTUBE") {
      const targetYtId = file.drive_file_id || file.youtube_url;
      if (targetYtId) {
        try {
          await deleteVideo(targetYtId);
        } catch (ytErr) {
          console.error("[YouTube Delete API Failed]", ytErr?.response?.data || ytErr?.message || ytErr);
        }
      }
    } else {
      const targetDriveId = file.google_drive_id || file.drive_file_id;
      if (targetDriveId) {
        try {
          await drive.files.delete({ fileId: targetDriveId });
        } catch (driveErr) {
          console.error("[Drive Delete API Failed]", driveErr?.response?.data || driveErr?.message || driveErr);
        }
      }
    }

    // Delete DB document
    await File.findByIdAndDelete(fileId);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully.",
      deletedId: fileId,
    });

  } catch (error) {
    console.error("[File Delete API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete file." },
      { status: 500 }
    );
  }
}
