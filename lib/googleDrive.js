import { google } from "googleapis";

// ── Auth ─────────────────────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

export default drive;

// ── Folder Helpers ────────────────────────────────────────────────────────────

/**
 * Find a folder by name inside a parent folder.
 * Returns the folder ID if found, or null if not found.
 */
async function findFolder(parentId, name) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return res.data.files.length > 0 ? res.data.files[0].id : null;
}

/**
 * Get a folder by name inside a parent, or create it if it doesn't exist.
 * Returns the folder ID.
 */
export async function getOrCreateFolder(parentId, name) {
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
  return folder.data.id;
}

// ── MIME → Category/Type Mapping ─────────────────────────────────────────────

/**
 * Determines the Drive folder category and type from a file's MIME type.
 * Returns { category, type, driveSubPath }
 *
 * Drive path structure:
 *   Documents → PDF|Word|PowerPoint|Excel|Others → <subject>
 *   Videos    → <subject>
 *   Images    → <subject>
 *   Assignments → <subject>  (forced by isAssignment flag)
 *   Others    → <subject>
 */
export function resolveFileCategory(mimeType, isAssignment = false) {
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
 *
 * Example:
 *   resolveDrivePath('application/pdf', false, 'Networking')
 *   → Creates/finds: root/Documents/PDF/Networking
 *   → Returns folder ID of "Networking"
 */
export async function resolveDrivePath(mimeType, isAssignment, subject) {
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