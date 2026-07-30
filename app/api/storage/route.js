import db from "@/lib/database";
import { getDriveStorageQuota } from "@/lib/googleDrive";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Fetch official Google Drive Quota
    const driveInfo = await getDriveStorageQuota();
    const storageQuota = driveInfo?.storageQuota || {};

    const limitBytes  = parseInt(storageQuota.limit || "16106127360", 10); // Default 15 GB
    const usageBytes  = parseInt(storageQuota.usage || "0", 10);
    const driveBytes  = parseInt(storageQuota.usageInDrive || "0", 10);

    // 2. Fetch database LMS aggregate grouped by storage_type
    const [lmsTotals] = await db.execute(`
      SELECT 
        COUNT(*) AS total_files, 
        COALESCE(SUM(size_bytes), 0) AS total_lms_bytes,
        COALESCE(SUM(CASE WHEN storage_type = 'GOOGLE_DRIVE' THEN size_bytes ELSE 0 END), 0) AS drive_lms_bytes,
        COALESCE(SUM(CASE WHEN storage_type = 'YOUTUBE' THEN size_bytes ELSE 0 END), 0) AS youtube_lms_bytes,
        COALESCE(SUM(CASE WHEN storage_type = 'YOUTUBE' THEN 1 ELSE 0 END), 0) AS youtube_file_count
      FROM lms_files
    `);

    const totalFiles       = lmsTotals[0]?.total_files || 0;
    const totalLmsBytes    = parseInt(lmsTotals[0]?.total_lms_bytes || 0, 10);
    const driveLmsBytes    = parseInt(lmsTotals[0]?.drive_lms_bytes || 0, 10);
    const youtubeLmsBytes  = parseInt(lmsTotals[0]?.youtube_lms_bytes || 0, 10);
    const youtubeFileCount = parseInt(lmsTotals[0]?.youtube_file_count || 0, 10);

    // 3. Fetch storage breakdown per user
    const [userBreakdown] = await db.execute(`
      SELECT 
        f.uploaded_by AS email,
        COALESCE(u.name, f.uploaded_by) AS name,
        COUNT(f.id) AS file_count,
        COALESCE(SUM(f.size_bytes), 0) AS storage_bytes
      FROM lms_files f
      LEFT JOIN users u ON LOWER(f.uploaded_by) = LOWER(u.email)
      GROUP BY f.uploaded_by, u.name
      ORDER BY storage_bytes DESC
    `);

    return NextResponse.json({
      success: true,
      quota: {
        limitBytes,
        usageBytes: usageBytes > 0 ? usageBytes : driveLmsBytes,
        driveBytes: driveBytes > 0 ? driveBytes : driveLmsBytes,
        freeBytes: Math.max(0, limitBytes - (usageBytes > 0 ? usageBytes : driveLmsBytes)),
        lmsTotalBytes: totalLmsBytes,
        driveLmsBytes,
        youtubeLmsBytes,
        youtubeFileCount,
        totalFiles,
        userEmail: driveInfo?.user?.emailAddress || "Google Drive Account",
      },
      users: userBreakdown,
    });
  } catch (error) {
    console.error("[Storage API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch storage data." },
      { status: 500 }
    );
  }
}
