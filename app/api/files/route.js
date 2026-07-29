import db from "@/lib/database";
import { NextResponse } from "next/server";

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
      SELECT
        f.id,
        f.drive_file_id,
        f.drive_url,
        f.name,
        f.category,
        f.type,
        f.uploaded_by,
        f.size_bytes,
        f.created_at,
        s.name AS subject
      FROM lms_files f
      LEFT JOIN subjects s ON f.subject_id = s.id
    `;

    const conditions = [];
    const params = [];

    // Person-wise filter — join file_access
    if (userEmail) {
      query += ` INNER JOIN file_access fa ON f.id = fa.file_id AND fa.user_email = ?`;
      params.push(userEmail);
    }

    if (category)  { conditions.push("f.category = ?");  params.push(category); }
    if (type)      { conditions.push("f.type = ?");       params.push(type); }
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
