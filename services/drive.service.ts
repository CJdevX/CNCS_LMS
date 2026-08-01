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
  category: "Documents" | "Videos" | "Images" | "Assignments" | "Audio" | "Others";
  type: string;
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

// ── MIME / Extension → Category/Type Mapping ──────────────────────────────────

/**
 * Determines the Drive folder category and type from a file's MIME type and filename.
 * Returns { category, type, pathParts }
 */
export function resolveFileCategory(
  mimeType: string,
  filename: string = "",
  isAssignment: boolean = false
): ResolvedFileCategory {
  if (isAssignment) {
    return { category: "Assignments", type: ".assignment", pathParts: ["Assignments"] };
  }

  const lowerName = (filename || "").toLowerCase();
  const rawExt = lowerName.includes(".") ? lowerName.split(".").pop() || "" : "";
  const extLabel = rawExt ? `.${rawExt}` : "";

  // 1. Videos
  if (
    mimeType.startsWith("video/") ||
    ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "3gp", "ts"].includes(rawExt)
  ) {
    return { category: "Videos", type: extLabel || ".video", pathParts: ["Videos"] };
  }

  // 2. Images
  if (
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff", "heic"].includes(rawExt)
  ) {
    return { category: "Images", type: extLabel || ".image", pathParts: ["Images"] };
  }

  // 3. Documents - PDF
  if (mimeType === "application/pdf" || rawExt === "pdf") {
    return { category: "Documents", type: extLabel || ".pdf", pathParts: ["Documents", "PDF"] };
  }

  // 4. Documents - Word
  if (
    mimeType.includes("word") ||
    ["doc", "docx", "odt", "rtf"].includes(rawExt)
  ) {
    return { category: "Documents", type: extLabel || ".docx", pathParts: ["Documents", "Word"] };
  }

  // 5. Documents - PowerPoint
  if (
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation") ||
    ["ppt", "pptx", "odp"].includes(rawExt)
  ) {
    return { category: "Documents", type: extLabel || ".pptx", pathParts: ["Documents", "PowerPoint"] };
  }

  // 6. Documents - Excel / Spreadsheets
  if (
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    ["xls", "xlsx", "csv", "ods"].includes(rawExt)
  ) {
    return { category: "Documents", type: extLabel || ".xlsx", pathParts: ["Documents", "Excel"] };
  }

  // 7. Documents - JSON
  if (mimeType === "application/json" || rawExt === "json") {
    return { category: "Documents", type: extLabel || ".json", pathParts: ["Documents", "JSON"] };
  }

  // 8. Documents - Text / Markdown
  if (mimeType.startsWith("text/plain") || ["txt", "text", "md", "markdown", "log"].includes(rawExt)) {
    return { category: "Documents", type: extLabel || ".txt", pathParts: ["Documents", "Text"] };
  }

  // 9. Documents - Code / Scripts
  if (
    ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "h", "cs", "php", "sql", "sh", "xml", "yaml", "yml", "html", "css"].includes(rawExt)
  ) {
    return { category: "Documents", type: extLabel || ".code", pathParts: ["Documents", "Code"] };
  }

  // 10. Audio
  if (
    mimeType.startsWith("audio/") ||
    ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"].includes(rawExt)
  ) {
    return { category: "Audio", type: extLabel || ".mp3", pathParts: ["Audio"] };
  }

  // 11. Archives / Zip
  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(rawExt)
  ) {
    return { category: "Others", type: extLabel || ".zip", pathParts: ["Others", "Archives"] };
  }

  // 12. Dynamic Extension Fallback (e.g. .iso, .epub, .cad, .psd, .exe)
  if (extLabel) {
    return { category: "Others", type: extLabel, pathParts: ["Others", rawExt.toUpperCase()] };
  }

  return { category: "Others", type: ".file", pathParts: ["Others"] };
}

/**
 * Resolves the full Drive folder path and returns the target folder ID.
 * Auto-creates any missing folders along the way.
 */
export async function resolveDrivePath(
  mimeType: string,
  filename: string,
  isAssignment: boolean,
  subject: string
): Promise<string> {
  const { pathParts } = resolveFileCategory(mimeType, filename, isAssignment);

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

/**
 * Initiates a Google Drive Resumable Upload session.
 * Returns { uploadUrl, targetFolderId } where uploadUrl is the session URL for direct binary PUT.
 */
export async function createDriveResumableSession(
  mimeType: string,
  filename: string,
  fileSize: number,
  isAssignment: boolean,
  subject: string
): Promise<{ uploadUrl: string; targetFolderId: string }> {
  const targetFolderId = await resolveDrivePath(mimeType, filename, isAssignment, subject);

  const tokenResponse = await oauth2Client.getAccessToken();
  const accessToken = tokenResponse.token;
  if (!accessToken) {
    throw new Error("Failed to retrieve Google OAuth access token for Drive upload.");
  }

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType || "application/octet-stream",
        "X-Upload-Content-Length": fileSize ? fileSize.toString() : "0",
      },
      body: JSON.stringify({
        name: filename,
        parents: [targetFolderId],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Drive resumable session initialization failed (${response.status}): ${errText}`);
  }

  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Google Drive API did not return a location header for resumable upload session.");
  }

  return { uploadUrl, targetFolderId };
}

/**
 * Sets public read permission on a Google Drive file.
 */
export async function makeDriveFilePublic(fileId: string): Promise<void> {
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });
}

