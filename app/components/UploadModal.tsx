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
}

export interface UploadModalProps {
  subjects: Subject[];
  defaultUploaderEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export type StorageType = "GOOGLE_DRIVE" | "YOUTUBE";

const YOUTUBE_THRESHOLD_MB = parseInt(process.env.NEXT_PUBLIC_YOUTUBE_SIZE_THRESHOLD_MB || "100", 10) || 100;
const YOUTUBE_SIZE_THRESHOLD_BYTES = YOUTUBE_THRESHOLD_MB * 1024 * 1024;

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PDF:         { bg: "#fee2e2", text: "#b91c1c", icon: "📄" },
  Word:        { bg: "#dbeafe", text: "#1d4ed8", icon: "📝" },
  PowerPoint:  { bg: "#ffedd5", text: "#c2410c", icon: "📊" },
  Excel:       { bg: "#dcfce7", text: "#15803d", icon: "📈" },
  Video:       { bg: "#ede9fe", text: "#7c3aed", icon: "🎬" },
  Image:       { bg: "#fce7f3", text: "#be185d", icon: "🖼️" },
  Assignment:  { bg: "#fef9c3", text: "#a16207", icon: "📋" },
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
    if (isAssignment) return { category: "Assignments", type: "Assignment" };
    const lowerName = filename.toLowerCase();
    
    if (mimeType.startsWith("video/") || lowerName.endsWith(".mp4") || lowerName.endsWith(".mkv") || lowerName.endsWith(".avi") || lowerName.endsWith(".mov")) {
      return { category: "Videos", type: "Video" };
    }
    if (mimeType.startsWith("image/") || lowerName.endsWith(".png") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".webp")) {
      return { category: "Images", type: "Image" };
    }
    if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
      return { category: "Documents", type: "PDF" };
    }
    if (mimeType.includes("word") || lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) {
      return { category: "Documents", type: "Word" };
    }
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation") || lowerName.endsWith(".ppt") || lowerName.endsWith(".pptx")) {
      return { category: "Documents", type: "PowerPoint" };
    }
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
      return { category: "Documents", type: "Excel" };
    }
    return { category: "Others", type: "Other" };
  }

  function handleFileSelect(f: File) {
    setFile(f);
    const info = detectType(f.type, f.name, isAssign);
    setDetected(info);
    setError("");

    // Auto-routing logic based on video type and file size threshold (>= 100 MB)
    const isVideo = f.type.startsWith("video/") || /\.(mp4|mkv|avi|mov)$/i.test(f.name);
    if (isVideo && f.size >= YOUTUBE_SIZE_THRESHOLD_BYTES) {
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
    setStatusText(storageType === "YOUTUBE" ? "Preparing YouTube video upload…" : "Preparing Drive file upload…");
    setError("");

    const fd = new FormData();
    fd.append("file",         file);
    fd.append("subject",      newSubject.trim() || subject);
    fd.append("isAssignment", isAssign.toString());
    fd.append("uploadedBy",   uploadedBy.trim());
    fd.append("sharedWith",   sharedWith.trim());
    fd.append("storageType",  storageType);

    // Use XMLHttpRequest for real-time progress events
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
        if (percent < 100) {
          setStatusText(`Uploading file… ${percent}%`);
        } else {
          setStatusText(
            storageType === "YOUTUBE"
              ? "Processing & saving video to YouTube…"
              : "Uploading & saving to Google Drive…"
          );
        }
      }
    };

    xhr.onload = () => {
      setLoading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          setProgress(100);
          setStatusText("Upload complete!");
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 400);
        } else {
          setError(data.error || data.message || "Upload failed.");
        }
      } catch (err) {
        setError("Invalid response from server.");
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      setError("Network error occurred during upload.");
    };

    xhr.send(fd);
  }

  const style = detected ? (TYPE_COLORS[detected.type] || TYPE_COLORS.Other) : null;

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

          {detected && style && (
            <div className="detected-info">
              <div className="detected-pill" style={{ background: style.bg, color: style.text }}>
                {style.icon} {detected.type}
              </div>
              <div className="detected-pill detected-cat">
                📂 {detected.category}
              </div>
            </div>
          )}

          {/* Storage Destination Indicator & Selector */}
          {file && (
            <div
              style={{
                background: storageType === "YOUTUBE" ? "rgba(239, 68, 68, 0.08)" : "rgba(99, 102, 241, 0.08)",
                border: storageType === "YOUTUBE" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(99, 102, 241, 0.25)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                margin: "6px 0",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <span style={{ fontWeight: "600", color: storageType === "YOUTUBE" ? "#f87171" : "#818cf8" }}>
                  {storageType === "YOUTUBE" ? "🎥 Destination: YouTube" : "☁️ Destination: Google Drive"}
                </span>
                {isAutoRouted && (
                  <span style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "2px 8px", borderRadius: "999px", fontWeight: "500" }}>
                    ⚡ Auto-routed (&gt;{YOUTUBE_THRESHOLD_MB}MB Video)
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>Storage Target:</label>
                <select
                  value={storageType}
                  onChange={(e) => {
                    setStorageType(e.target.value as StorageType);
                    setIsAutoRouted(false);
                  }}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="GOOGLE_DRIVE">Google Drive (Default)</option>
                  <option value="YOUTUBE">YouTube (Saves Drive Space)</option>
                </select>
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
