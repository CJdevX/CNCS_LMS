import dbConnect from "@/lib/database";
import File from "@/lib/models/File";
import User from "@/lib/models/User";
import { getDriveStorageQuota } from "@/services/drive.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    // 1. Fetch official Google Drive Quota
    let driveInfo = null;
    try {
      driveInfo = await getDriveStorageQuota();
    } catch (e) {
      console.warn("[Storage API] Drive quota fetch warning:", e.message);
    }
    const storageQuota = driveInfo?.storageQuota || {};

    const limitBytes  = parseInt(storageQuota.limit || "16106127360", 10); // Default 15 GB
    const usageBytes  = parseInt(storageQuota.usage || "0", 10);
    const driveBytes  = parseInt(storageQuota.usageInDrive || "0", 10);

    // 2. Aggregate LMS files grouped by storage_type
    const lmsAggregate = await File.aggregate([
      {
        $group: {
          _id: null,
          total_files: { $sum: 1 },
          total_lms_bytes: { $sum: "$size_bytes" },
          drive_lms_bytes: {
            $sum: {
              $cond: [{ $eq: ["$storage_type", "GOOGLE_DRIVE"] }, "$size_bytes", 0],
            },
          },
          youtube_lms_bytes: {
            $sum: {
              $cond: [{ $eq: ["$storage_type", "YOUTUBE"] }, "$size_bytes", 0],
            },
          },
          youtube_file_count: {
            $sum: {
              $cond: [{ $eq: ["$storage_type", "YOUTUBE"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = lmsAggregate[0] || {
      total_files: 0,
      total_lms_bytes: 0,
      drive_lms_bytes: 0,
      youtube_lms_bytes: 0,
      youtube_file_count: 0,
    };

    const totalFiles       = stats.total_files;
    const totalLmsBytes    = stats.total_lms_bytes;
    const driveLmsBytes    = stats.drive_lms_bytes;
    const youtubeLmsBytes  = stats.youtube_lms_bytes;
    const youtubeFileCount = stats.youtube_file_count;

    // 3. Aggregate storage breakdown per user
    const userBreakdownRaw = await File.aggregate([
      {
        $group: {
          _id: "$uploaded_by",
          file_count: { $sum: 1 },
          storage_bytes: { $sum: "$size_bytes" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "userInfo",
        },
      },
      {
        $project: {
          email: "$_id",
          name: {
            $ifNull: [{ $arrayElemAt: ["$userInfo.name", 0] }, "$_id"],
          },
          file_count: 1,
          storage_bytes: 1,
        },
      },
      {
        $sort: { storage_bytes: -1 },
      },
    ]);

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
      users: userBreakdownRaw,
    });
  } catch (error) {
    console.error("[Storage API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch storage data." },
      { status: 500 }
    );
  }
}
