import { google } from "googleapis";

// ── OAuth Client Setup ───────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

/**
 * Authenticated Google Drive API v3 client instance.
 */
export const drive = google.drive({ version: "v3", auth: oauth2Client });
export default drive;

// ── TypeScript Interfaces ─────────────────────────────────────────────────────

export interface ResolvedFileCategory {
  category: "Documents" | "Videos" | "Images" | "Assignments" | "Others";
  type: "PDF" | "Word" | "PowerPoint" | "Excel" | "Video" | "Image" | "Assignment" | "Other";
  pathParts: string[];
}

export interface DriveStorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

export interface DriveUserInfo {
  displayName?: string;
  emailAddress?: string;
}

export interface DriveAboutData {
  storageQuota?: DriveStorageQuota;
  user?: DriveUserInfo;
}

// ── Folder Helpers ────────────────────────────────────────────────────────────

/**
 * Find a folder by name inside a parent folder.
 * Returns the folder ID if found, or null if not found.
 */
export async function findFolder(parentId: string, name: string): Promise<string | null> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const files = res.data.files;
  return files && files.length > 0 && files[0].id ? files[0].id : null;
}

/**
 * Get a folder by name inside a parent, or create it if it doesn't exist.
 * Returns the folder ID.
 */
export async function getOrCreateFolder(parentId: string, name: string): Promise<string> {
  const existing = await findFolder(parentId, name);
  if (existing) return existing;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  if (!folder.data.id) {
    throw new Error(`Failed to create Google Drive folder: ${name}`);
  }
  return folder.data.id;
}

// ── MIME → Category/Type Mapping ─────────────────────────────────────────────

/**
 * Determines the Drive folder category and type from a file's MIME type.
 * Returns { category, type, pathParts }
 */
export function resolveFileCategory(mimeType: string, isAssignment: boolean = false): ResolvedFileCategory {
  if (isAssignment) {
    return { category: "Assignments", type: "Assignment", pathParts: ["Assignments"] };
  }

  // Videos
  if (mimeType.startsWith("video/")) {
    return { category: "Videos", type: "Video", pathParts: ["Videos"] };
  }

  // Images
  if (mimeType.startsWith("image/")) {
    return { category: "Images", type: "Image", pathParts: ["Images"] };
  }

  // Documents
  if (mimeType === "application/pdf") {
    return { category: "Documents", type: "PDF", pathParts: ["Documents", "PDF"] };
  }

  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return { category: "Documents", type: "Word", pathParts: ["Documents", "Word"] };
  }

  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return { category: "Documents", type: "PowerPoint", pathParts: ["Documents", "PowerPoint"] };
  }

  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return { category: "Documents", type: "Excel", pathParts: ["Documents", "Excel"] };
  }

  // Catch-all document types
  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return { category: "Documents", type: "Other", pathParts: ["Documents", "Others"] };
  }

  // Everything else
  return { category: "Others", type: "Other", pathParts: ["Others"] };
}

/**
 * Resolves the full Drive folder path and returns the target folder ID.
 * Auto-creates any missing folders along the way.
 */
export async function resolveDrivePath(mimeType: string, isAssignment: boolean, subject: string): Promise<string> {
  const { pathParts } = resolveFileCategory(mimeType, isAssignment);

  // Start from Google Drive root
  let currentParentId = "root";

  // Walk through each folder level, creating if missing
  for (const part of pathParts) {
    currentParentId = await getOrCreateFolder(currentParentId, part);
  }

  // Finally, create/find the subject folder
  const subjectFolderId = await getOrCreateFolder(currentParentId, subject);
  return subjectFolderId;
}

/**
 * Fetch storage quota from Google Drive API about.get()
 */
export async function getDriveStorageQuota(): Promise<DriveAboutData | null> {
  try {
    const res = await drive.about.get({
      fields: "storageQuota, user",
    });
    return res.data as DriveAboutData;
  } catch (error) {
    console.error("[Drive Storage Quota Error]", error);
    return null;
  }
}
