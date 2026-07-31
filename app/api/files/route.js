import db from "@/lib/database";
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
    const { searchParams } = new URL(request.url);

    const category  = searchParams.get("category");
    const type      = searchParams.get("type");
    const subject   = searchParams.get("subject");
    const userEmail = searchParams.get("userEmail");
    const search    = searchParams.get("search");

    // Base query with subject name join
    let query = `
      SELECT DISTINCT
        f.id,
        f.drive_file_id,
        f.drive_url,
        f.name,
        f.category,
        f.type,
        f.uploaded_by,
        f.size_bytes,
        f.storage_type,
        f.google_drive_id,
        f.youtube_url,
        f.created_at,
        s.name AS subject
      FROM lms_files f
      LEFT JOIN subjects s ON f.subject_id = s.id
    `;

    const conditions = [];
    const params = [];

    // Filter by uploader email
    if (userEmail) {
      conditions.push("LOWER(f.uploaded_by) = ?");
      params.push(userEmail.toLowerCase());
    }

    if (category === "Others" || type === "Other") {
      conditions.push("(f.category = 'Others' OR f.type = 'Other')");
    } else {
      if (category)  { conditions.push("f.category = ?");  params.push(category); }
      if (type)      { conditions.push("f.type = ?");       params.push(type); }
    }
    if (subject)   { conditions.push("s.name = ?");       params.push(subject); }
    if (search)    { conditions.push("f.name LIKE ?");    params.push(`%${search}%`); }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY f.created_at DESC";

    const [rows] = await db.execute(query, params);

    return NextResponse.json({ success: true, count: rows.length, files: rows });

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
    const [[file]] = await db.execute(
      "SELECT * FROM lms_files WHERE id = ?",
      [fileId]
    );

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
    let externalDeleteWarning = null;
    if (file.storage_type === "YOUTUBE") {
      const targetYtId = file.drive_file_id || file.youtube_url;
      if (targetYtId) {
        try {
          await deleteVideo(targetYtId);
        } catch (ytErr) {
          console.error("[YouTube Delete API Failed]", ytErr?.response?.data || ytErr?.message || ytErr);
          externalDeleteWarning = "File removed from LMS database, but YouTube video could not be deleted automatically due to insufficient OAuth permissions on your Google Refresh Token.";
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

    // Delete DB records
    await db.execute("DELETE FROM lms_files WHERE id = ?", [fileId]);

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

