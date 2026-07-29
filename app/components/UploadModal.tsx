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
  const [file, setFile]           = useState<File | null>(null);
  const [detected, setDetected]   = useState<DetectedInfo | null>(null);
  const [subject, setSubject]     = useState<string>("");
  const [newSubject, setNewSubj]  = useState<string>("");
  const [isAssign, setIsAssign]   = useState<boolean>(false);
  const [sharedWith, setShared]   = useState<string>("");
  const [uploadedBy]              = useState<string>(defaultUploaderEmail || "");
  const [loading, setLoading]     = useState<boolean>(false);
  const [error, setError]         = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  function detectType(mimeType: string, filename: string, isAssignment: boolean): DetectedInfo {
    if (isAssignment) return { category: "Assignments", type: "Assignment" };
    const lowerName = filename.toLowerCase();
    
    if (mimeType.startsWith("video/") || lowerName.endsWith(".mp4") || lowerName.endsWith(".mkv") || lowerName.endsWith(".avi")) {
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
    setDetected(detectType(f.type, f.name, isAssign));
    setError("");
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
    setError("");

    const fd = new FormData();
    fd.append("file",         file);
    fd.append("subject",      newSubject.trim() || subject);
    fd.append("isAssignment", isAssign.toString());
    fd.append("uploadedBy",   uploadedBy.trim());
    fd.append("sharedWith",   sharedWith.trim());

    try {
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      setLoading(false);
      if (data.success) { onSuccess(); onClose(); }
      else setError(data.error || "Upload failed.");
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  const style = detected ? (TYPE_COLORS[detected.type] || TYPE_COLORS.Other) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload File</h2>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Drag & Drop Zone */}
          <div
            className={`dropzone ${isDragging ? "dragging" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              borderColor: isDragging ? "var(--accent)" : undefined,
              background: isDragging ? "rgba(99, 102, 241, 0.15)" : undefined,
            }}
          >
            {file ? (
              <div className="dropzone-preview">
                <span style={{ fontSize: "2rem" }}>{style?.icon}</span>
                <p className="dropzone-filename">{file.name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Size: <strong>{formatFileSize(file.size)}</strong>
                </p>
                <p className="dropzone-change">Click or drag another file to replace</p>
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
            <input ref={fileRef} type="file" hidden onChange={handleFileChange} />
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

          {/* Mark as Assignment Checkbox */}
          <label className="checkbox-row" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", margin: "4px 0" }}>
            <input type="checkbox" checked={isAssign} onChange={handleAssignToggle} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <span>📋 Mark as Assignment</span>
          </label>

          {/* Subject select */}
          <div className="field-group">
            <label>Subject *</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
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
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-upload" disabled={loading}>
            {loading ? "Uploading to Drive…" : "⬆️ Upload to Drive"}
          </button>
        </form>
      </div>
    </div>
  );
}
