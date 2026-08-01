"use client";

import React, { useState, useRef } from "react";

export interface Subject {
  id: number;
  name: string;
  created_at?: string;
}

export interface DetectedInfo {
  category: string;
  type: string;
  typeLabel: string;
  pathParts: string[];
}

export interface UploadModalProps {
  subjects: Subject[];
  defaultUploaderEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export type StorageType = "GOOGLE_DRIVE" | "YOUTUBE";



const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  ".pdf":        { bg: "#fee2e2", text: "#b91c1c", icon: "📄" },
  ".doc":        { bg: "#dbeafe", text: "#1d4ed8", icon: "📝" },
  ".docx":       { bg: "#dbeafe", text: "#1d4ed8", icon: "📝" },
  ".ppt":        { bg: "#ffedd5", text: "#c2410c", icon: "📊" },
  ".pptx":       { bg: "#ffedd5", text: "#c2410c", icon: "📊" },
  ".xls":        { bg: "#dcfce7", text: "#15803d", icon: "📈" },
  ".xlsx":       { bg: "#dcfce7", text: "#15803d", icon: "📈" },
  ".mp4":        { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  ".mkv":        { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  ".avi":        { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  ".mov":        { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  ".webm":       { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  ".png":        { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  ".jpg":        { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  ".jpeg":       { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  ".webp":       { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  ".gif":        { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  ".svg":        { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  ".mp3":        { bg: "#f3e8ff", text: "#7e22ce", icon: "🎵" },
  ".wav":        { bg: "#f3e8ff", text: "#7e22ce", icon: "🎵" },
  ".aac":        { bg: "#f3e8ff", text: "#7e22ce", icon: "🎵" },
  ".flac":       { bg: "#f3e8ff", text: "#7e22ce", icon: "🎵" },
  ".zip":        { bg: "#ffedd5", text: "#9a3412", icon: "📦" },
  ".rar":        { bg: "#ffedd5", text: "#9a3412", icon: "📦" },
  ".7z":         { bg: "#ffedd5", text: "#9a3412", icon: "📦" },
  ".json":       { bg: "#fef3c7", text: "#d97706", icon: "⚙️" },
  ".txt":        { bg: "#e0f2fe", text: "#0369a1", icon: "📜" },
  ".md":         { bg: "#e0f2fe", text: "#0369a1", icon: "📜" },
  ".py":         { bg: "#dcfce7", text: "#166534", icon: "🐍" },
  ".js":         { bg: "#e0e7ff", text: "#4338ca", icon: "💻" },
  ".ts":         { bg: "#e0e7ff", text: "#4338ca", icon: "💻" },
  ".sql":        { bg: "#cff4fc", text: "#055160", icon: "🗄️" },

  PDF:         { bg: "#fee2e2", text: "#b91c1c", icon: "📄" },
  Word:        { bg: "#dbeafe", text: "#1d4ed8", icon: "📝" },
  PowerPoint:  { bg: "#ffedd5", text: "#c2410c", icon: "📊" },
  Excel:       { bg: "#dcfce7", text: "#15803d", icon: "📈" },
  Video:       { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  Image:       { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  Assignment:  { bg: "#fef9c3", text: "#a16207", icon: "📋" },
  JSON:        { bg: "#fef3c7", text: "#d97706", icon: "⚙️" },
  Text:        { bg: "#e0f2fe", text: "#0369a1", icon: "📜" },
  Audio:       { bg: "#f3e8ff", text: "#7e22ce", icon: "🎵" },
  Archive:     { bg: "#ffedd5", text: "#9a3412", icon: "📦" },
  Code:        { bg: "#e0e7ff", text: "#4338ca", icon: "💻" },
  Python:      { bg: "#dcfce7", text: "#166534", icon: "🐍" },
  SQL:         { bg: "#cff4fc", text: "#055160", icon: "🗄️" },
  Other:       { bg: "#f1f5f9", text: "#475569", icon: "📁" },
};

export default function UploadModal({ subjects, defaultUploaderEmail, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile]                 = useState<File | null>(null);
  const [detected, setDetected]         = useState<DetectedInfo | null>(null);
  const [subject, setSubject]           = useState<string>("");
  const [newSubject, setNewSubj]        = useState<string>("");
  const [isAssign, setIsAssign]         = useState<boolean>(false);
  const [sharedWith, setShared]         = useState<string>("");
  const [uploadedBy]                    = useState<string>(defaultUploaderEmail || "");
  const [storageType, setStorageType]   = useState<StorageType>("GOOGLE_DRIVE");
  const [isAutoRouted, setIsAutoRouted] = useState<boolean>(false);

  const [loading, setLoading]           = useState<boolean>(false);
  const [uploadProgress, setProgress]     = useState<number>(0);
  const [statusText, setStatusText]       = useState<string>("");
  const [error, setError]               = useState<string>("");
  const [isDragging, setIsDragging]     = useState<boolean>(false);
  const fileRef                         = useRef<HTMLInputElement>(null);

  function detectType(mimeType: string, filename: string, isAssignment: boolean): DetectedInfo {
    if (isAssignment) {
      return { category: "Assignments", type: ".assignment", typeLabel: "Assignment", pathParts: ["Assignments"] };
    }

    const lowerName = (filename || "").toLowerCase();
    const rawExt = lowerName.includes(".") ? lowerName.split(".").pop() || "" : "";
    const extLabel = rawExt ? `.${rawExt}` : "";

    // 1. Videos -> YouTube
    if (
      mimeType.startsWith("video/") ||
      ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "3gp", "ts"].includes(rawExt)
    ) {
      return { category: "Videos", type: extLabel || ".mp4", typeLabel: "Video", pathParts: ["YouTube"] };
    }

    // 2. Images -> Google Drive
    if (
      mimeType.startsWith("image/") ||
      ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff", "heic"].includes(rawExt)
    ) {
      return { category: "Images", type: extLabel || ".image", typeLabel: "Image", pathParts: ["Images"] };
    }

    // 3. Documents - PDF
    if (mimeType === "application/pdf" || rawExt === "pdf") {
      return { category: "Documents", type: extLabel || ".pdf", typeLabel: "Document", pathParts: ["Documents", "PDF"] };
    }

    // 4. Documents - Word
    if (mimeType.includes("word") || ["doc", "docx", "odt", "rtf"].includes(rawExt)) {
      return { category: "Documents", type: extLabel || ".docx", typeLabel: "Word", pathParts: ["Documents", "Word"] };
    }

    // 5. Documents - PowerPoint
    if (
      mimeType.includes("powerpoint") ||
      mimeType.includes("presentation") ||
      ["ppt", "pptx", "odp"].includes(rawExt)
    ) {
      return { category: "Documents", type: extLabel || ".pptx", typeLabel: "PowerPoint", pathParts: ["Documents", "PowerPoint"] };
    }

    // 6. Documents - Excel / Spreadsheets
    if (
      mimeType.includes("excel") ||
      mimeType.includes("spreadsheet") ||
      ["xls", "xlsx", "csv", "ods"].includes(rawExt)
    ) {
      return { category: "Documents", type: extLabel || ".xlsx", typeLabel: "Excel", pathParts: ["Documents", "Excel"] };
    }

    // 7. Documents - JSON
    if (mimeType === "application/json" || rawExt === "json") {
      return { category: "Documents", type: extLabel || ".json", typeLabel: "JSON", pathParts: ["Documents", "JSON"] };
    }

    // 8. Documents - Text / Markdown
    if (mimeType.startsWith("text/plain") || ["txt", "text", "md", "markdown", "log"].includes(rawExt)) {
      return { category: "Documents", type: extLabel || ".txt", typeLabel: "Text File", pathParts: ["Documents", "Text"] };
    }

    // 9. Documents - Code / Scripts
    if (
      ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "h", "cs", "php", "sql", "sh", "xml", "yaml", "yml", "html", "css"].includes(rawExt)
    ) {
      return { category: "Documents", type: extLabel || ".code", typeLabel: "Code Script", pathParts: ["Documents", "Code"] };
    }

    // 10. Audio
    if (
      mimeType.startsWith("audio/") ||
      ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"].includes(rawExt)
    ) {
      return { category: "Audio", type: extLabel || ".mp3", typeLabel: "Audio File", pathParts: ["Audio"] };
    }

    // 11. Archives / Zip
    if (
      mimeType.includes("zip") ||
      mimeType.includes("compressed") ||
      ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(rawExt)
    ) {
      return { category: "Others", type: extLabel || ".zip", typeLabel: "Archive", pathParts: ["Others", "Archives"] };
    }

    // 12. Dynamic Extension Fallback
    if (extLabel) {
      return { category: "Others", type: extLabel, typeLabel: `${rawExt.toUpperCase()}`, pathParts: ["Others", rawExt.toUpperCase()] };
    }

    return { category: "Others", type: ".file", typeLabel: "File", pathParts: ["Others"] };
  }

  function handleFileSelect(f: File) {
    setFile(f);
    const info = detectType(f.type, f.name, isAssign);
    setDetected(info);
    setError("");

    // Auto-routing logic: Every video file uploads to YouTube. Other files upload to Google Drive.
    const isVideo = f.type.startsWith("video/") || /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v|3gp|ts)$/i.test(f.name);
    if (isVideo) {
      setStorageType("YOUTUBE");
      setIsAutoRouted(true);
    } else {
      setStorageType("GOOGLE_DRIVE");
      setIsAutoRouted(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  function handleAssignToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setIsAssign(checked);
    if (file) setDetected(detectType(file.type, file.name, checked));
  }

  function get1stLevelDestinationFolder(
    category: string,
    storage: StorageType
  ): string {
    if (storage === "YOUTUBE") {
      return "YouTube";
    }
    return category;
  }

  function formatFileSize(bytes: number): string {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file)                   return setError("Please choose a file.");
    if (!subject && !newSubject) return setError("Please select or enter a subject.");

    setLoading(true);
    setProgress(0);
    setStatusText(storageType === "YOUTUBE" ? "Initializing YouTube upload…" : "Initializing Drive upload…");
    setError("");

    const targetSubject = newSubject.trim() || subject;

    try {
      // Step 1: Request direct upload session URL from Next.js API (Lightweight JSON)
      const initRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          subject: targetSubject,
          isAssignment: isAssign,
          uploadedBy: uploadedBy.trim(),
          storageType: storageType,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success || !initData.uploadUrl) {
        throw new Error(initData.error || initData.message || "Failed to initialize upload session.");
      }

      const uploadUrl = initData.uploadUrl;

      // Step 2: Upload file binary directly from browser to Google/YouTube uploadUrl
      setStatusText(storageType === "YOUTUBE" ? "Uploading video to YouTube…" : "Uploading file to Google Drive…");

      const uploadedFileId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
            if (percent < 100) {
              setStatusText(`Uploading file… ${percent}%`);
            } else {
              setStatusText(
                storageType === "YOUTUBE"
                  ? "Processing video on YouTube…"
                  : "Finalizing file on Google Drive…"
              );
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const resData = JSON.parse(xhr.responseText || "{}");
              if (resData.id) {
                resolve(resData.id);
              } else {
                reject(new Error("Upload completed but no file ID was returned."));
              }
            } catch (err) {
              reject(new Error("Failed to parse response from upload server."));
            }
          } else {
            reject(new Error(`Direct upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error occurred during direct file upload."));
        xhr.send(file);
      });

      // Step 3: Record upload completion in MongoDB
      setStatusText("Saving upload details…");
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: uploadedFileId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          subject: targetSubject,
          isAssignment: isAssign,
          uploadedBy: uploadedBy.trim(),
          storageType: storageType,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok || !completeData.success) {
        throw new Error(completeData.error || completeData.message || "Failed to save file metadata.");
      }

      setProgress(100);
      setStatusText("Upload complete!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 400);

    } catch (err: any) {
      setLoading(false);
      setError(err.message || "An error occurred during upload.");
    }
  }

  const style = detected ? (TYPE_COLORS[detected.type.toLowerCase()] || TYPE_COLORS[detected.type] || { bg: "#e2e8f0", text: "#334155", icon: "📄" }) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload File</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Drag & Drop Zone */}
          <div
            className={`dropzone ${isDragging ? "dragging" : ""}`}
            onClick={() => !loading && fileRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              borderColor: isDragging ? "var(--accent)" : undefined,
              background: isDragging ? "rgba(99, 102, 241, 0.15)" : undefined,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {file ? (
              <div className="dropzone-preview">
                <span style={{ fontSize: "2rem" }}>{style?.icon}</span>
                <p className="dropzone-filename">{file.name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Size: <strong>{formatFileSize(file.size)}</strong>
                </p>
                {!loading && <p className="dropzone-change">Click or drag another file to replace</p>}
              </div>
            ) : (
              <>
                <span className="dropzone-icon">☁️</span>
                <p>Click or drag &amp; drop a file here</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Supports PDF, Word, PowerPoint, Excel, Videos, Images &amp; files
                </p>
              </>
            )}
            <input ref={fileRef} type="file" hidden onChange={handleFileChange} disabled={loading} />
          </div>

          {/* File Type & Destination Saved Folder Info Box */}
          {file && detected && style && (
            <div
              style={{
                background: storageType === "YOUTUBE" ? "rgba(239, 68, 68, 0.08)" : "rgba(99, 102, 241, 0.08)",
                border: storageType === "YOUTUBE" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(99, 102, 241, 0.25)",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                margin: "10px 0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* File Type & Target Storage */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.83rem", fontWeight: "600", color: "var(--text-primary)" }}>
                  <span>Detected File Type:</span>
                  <span
                    style={{
                      background: style.bg,
                      color: style.text,
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {style.icon} {detected.typeLabel || detected.type} ({detected.type})
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    background: storageType === "YOUTUBE" ? "rgba(239, 68, 68, 0.2)" : "rgba(99, 102, 241, 0.2)",
                    color: storageType === "YOUTUBE" ? "#fca5a5" : "#a5b4fc",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontWeight: "600",
                  }}
                >
                  {storageType === "YOUTUBE" ? "🎥 YouTube Upload" : "☁️ Google Drive Upload"}
                </span>
              </div>

              {/* Automatic Storage System Notice */}
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "6px" }}>
                {storageType === "YOUTUBE"
                  ? "⚡ Auto-detected video file: Every video is automatically uploaded to YouTube."
                  : "⚡ Auto-detected non-video file: All documents and other files are uploaded to Google Drive."}
              </div>
            </div>
          )}

          {/* Mark as Assignment Checkbox */}
          <label className="checkbox-row" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.85rem", margin: "4px 0" }}>
            <input type="checkbox" checked={isAssign} onChange={handleAssignToggle} disabled={loading} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <span>📋 Mark as Assignment</span>
          </label>

          {/* Subject select */}
          <div className="field-group">
            <label>Subject *</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={loading}>
              <option value="">— Select subject —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <p className="field-or">or add new subject:</p>
            <input
              type="text"
              placeholder="e.g. Mathematics"
              value={newSubject}
              onChange={(e) => setNewSubj(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Uploader email (Disabled) */}
          <div className="field-group">
            <label>Your Email *</label>
            <input
              type="email"
              value={uploadedBy}
              disabled
              style={{ opacity: 0.7, cursor: "not-allowed", background: "rgba(255,255,255,0.04)" }}
            />
          </div>

          {/* Share with */}
          <div className="field-group">
            <label>Share with (optional)</label>
            <input
              type="text"
              placeholder="student1@gmail.com, student2@gmail.com"
              value={sharedWith}
              onChange={(e) => setShared(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* ── Progress Bar Card (Visible when uploading) ── */}
          {loading && (
            <div style={{
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 16px",
              marginTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)" }}>
                <span>{statusText}</span>
                <span style={{ color: "var(--accent)" }}>{uploadProgress}%</span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "var(--bg-input)", borderRadius: "999px", overflow: "hidden", border: "1px solid var(--border)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background: storageType === "YOUTUBE" ? "linear-gradient(90deg, #ef4444, #f97316)" : "linear-gradient(90deg, #6366f1, #34d399)",
                    borderRadius: "999px",
                    transition: "width 0.2s ease-in-out",
                  }}
                />
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-upload" disabled={loading} style={{ marginTop: "12px", background: storageType === "YOUTUBE" ? "#dc2626" : undefined }}>
            {loading
              ? `Uploading… (${uploadProgress}%)`
              : storageType === "YOUTUBE"
              ? "🎥 Upload to YouTube"
              : "⬆️ Upload to Drive"
            }
          </button>
        </form>
      </div>
    </div>
  );
}
