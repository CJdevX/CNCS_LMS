"use client";

import React, { useState, useEffect, useRef } from "react";

// ── Types & Interfaces ────────────────────────────────────────────────────────
export interface LMSFile {
  id: number;
  drive_file_id: string;
  drive_url: string;
  name: string;
  category: string;
  type: string;
  subject: string;
  uploaded_by: string;
  size_bytes: number;
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  created_at?: string;
}

export interface DetectedInfo {
  category: string;
  type: string;
}

interface UploadModalProps {
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
}

// ── Type badge colors ─────────────────────────────────────────────────────────
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

const CATEGORIES = ["All", "Documents", "Videos", "Images", "Assignments", "Others"];
const DOC_TYPES  = ["All", "PDF", "Word", "PowerPoint", "Excel"];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({ file }: { file: LMSFile }) {
  const style = TYPE_COLORS[file.type] || TYPE_COLORS.Other;
  return (
    <a
      href={file.drive_url}
      target="_blank"
      rel="noopener noreferrer"
      className="file-card"
    >
      <div className="file-card-icon" style={{ background: style.bg }}>
        <span>{style.icon}</span>
      </div>
      <div className="file-card-body">
        <p className="file-name">{file.name}</p>
        <div className="file-meta">
          <span className="badge" style={{ background: style.bg, color: style.text }}>
            {file.type}
          </span>
          {file.subject && (
            <span className="badge subject-badge">{file.subject}</span>
          )}
          {file.size_bytes > 0 && (
            <span className="file-size">{formatBytes(file.size_bytes)}</span>
          )}
        </div>
        <p className="file-uploader">
          by {file.uploaded_by} · {formatDate(file.created_at)}
        </p>
      </div>
      <div className="file-card-arrow">↗</div>
    </a>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ subjects, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile]           = useState<File | null>(null);
  const [detected, setDetected]   = useState<DetectedInfo | null>(null);
  const [subject, setSubject]     = useState<string>("");
  const [newSubject, setNewSubj]  = useState<string>("");
  const [isAssign, setIsAssign]   = useState<boolean>(false);
  const [sharedWith, setShared]   = useState<string>("");
  const [uploadedBy, setUploader] = useState<string>("");
  const [loading, setLoading]     = useState<boolean>(false);
  const [error, setError]         = useState<string>("");
  const fileRef                   = useRef<HTMLInputElement>(null);

  function detectType(mimeType: string, isAssignment: boolean): DetectedInfo {
    if (isAssignment) return { category: "Assignments", type: "Assignment" };
    if (mimeType.startsWith("video/"))        return { category: "Videos",    type: "Video" };
    if (mimeType.startsWith("image/"))        return { category: "Images",    type: "Image" };
    if (mimeType === "application/pdf")       return { category: "Documents", type: "PDF" };
    if (mimeType.includes("word"))            return { category: "Documents", type: "Word" };
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
                                              return { category: "Documents", type: "PowerPoint" };
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
                                              return { category: "Documents", type: "Excel" };
    return { category: "Others", type: "Other" };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDetected(detectType(f.type, isAssign));
    setError("");
  }

  function handleAssignToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setIsAssign(checked);
    if (file) setDetected(detectType(file.type, checked));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file)               return setError("Please choose a file.");
    if (!subject && !newSubject) return setError("Please select or enter a subject.");
    if (!uploadedBy)         return setError("Please enter your email.");

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
          {/* File picker */}
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="dropzone-preview">
                <span style={{ fontSize: "2rem" }}>{style?.icon}</span>
                <p className="dropzone-filename">{file.name}</p>
                <p className="dropzone-change">Click to change</p>
              </div>
            ) : (
              <>
                <span className="dropzone-icon">☁️</span>
                <p>Click to choose a file</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={handleFileChange}
            />
          </div>

          {/* Auto-detected info */}
          {detected && style && (
            <div className="detected-info">
              <div className="detected-pill" style={{ background: style.bg, color: style.text }}>
                {style.icon} {detected.type}
              </div>
              <div className="detected-pill detected-cat">
                📂 {detected.category}
              </div>
              <p className="detected-note">Auto-detected from file type</p>
            </div>
          )}

          {/* Assignment checkbox — changes category */}
          <label className="checkbox-row">
            <input type="checkbox" checked={isAssign} onChange={handleAssignToggle} />
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

          {/* Uploader email */}
          <div className="field-group">
            <label>Your Email *</label>
            <input
              type="email"
              placeholder="teacher@gmail.com"
              value={uploadedBy}
              onChange={(e) => setUploader(e.target.value)}
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
            <p className="field-hint">Comma-separated student emails</p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-upload" disabled={loading}>
            {loading ? "Uploading…" : "⬆️ Upload to Drive"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Home() {
  const [files,       setFiles]    = useState<LMSFile[]>([]);
  const [subjects,    setSubjects] = useState<Subject[]>([]);
  const [loading,     setLoading]  = useState<boolean>(true);
  const [showModal,   setModal]    = useState<boolean>(false);

  // Filters
  const [catFilter,  setCat]    = useState<string>("All");
  const [typeFilter, setType]   = useState<string>("All");
  const [subFilter,  setSub]    = useState<string>("All");
  const [personFilter,setPerson]= useState<string>("");
  const [search,     setSearch] = useState<string>("");

  async function loadSubjects() {
    try {
      const res  = await fetch("/api/subjects");
      const data = await res.json();
      if (data.success) setSubjects(data.subjects);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFiles() {
    setLoading(true);
    const params = new URLSearchParams();
    if (catFilter  !== "All") params.set("category",  catFilter);
    if (typeFilter !== "All") params.set("type",       typeFilter);
    if (subFilter  !== "All") params.set("subject",    subFilter);
    if (personFilter.trim())  params.set("userEmail",  personFilter.trim());
    if (search.trim())        params.set("search",     search.trim());

    try {
      const res  = await fetch(`/api/files?${params}`);
      const data = await res.json();
      if (data.success) setFiles(data.files);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => { loadFiles(); }, [catFilter, typeFilter, subFilter, personFilter, search]);

  const showTypeFilter = catFilter === "All" || catFilter === "Documents";

  return (
    <>
      <div className="app">
        {/* ── Header ── */}
        <header className="header">
          <div className="header-inner">
            <div className="header-brand">
              <span className="header-logo">🎓</span>
              <div>
                <h1 className="header-title">CNCS LMS</h1>
                <p className="header-sub">Learning Management System</p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setModal(true)}>
              ⬆️ Upload File
            </button>
          </div>
        </header>

        {/* ── Filter Bar ── */}
        <div className="filter-bar">
          <div className="filter-inner">
            {/* Search */}
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search files…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category */}
            <select className="filter-select" value={catFilter} onChange={(e) => { setCat(e.target.value); setType("All"); }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* Type (only for Docs) */}
            {showTypeFilter && (
              <select className="filter-select" value={typeFilter} onChange={(e) => setType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}

            {/* Subject */}
            <select className="filter-select" value={subFilter} onChange={(e) => setSub(e.target.value)}>
              <option value="All">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            {/* Person */}
            <input
              className="filter-input"
              placeholder="Filter by email…"
              value={personFilter}
              onChange={(e) => setPerson(e.target.value)}
            />

            {/* Clear */}
            {(catFilter !== "All" || typeFilter !== "All" || subFilter !== "All" || personFilter || search) && (
              <button className="btn-clear" onClick={() => { setCat("All"); setType("All"); setSub("All"); setPerson(""); setSearch(""); }}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* ── File Grid ── */}
        <main className="main">
          {loading ? (
            <div className="state-msg">
              <span className="spinner" />
              <p>Loading files…</p>
            </div>
          ) : files.length === 0 ? (
            <div className="state-msg">
              <span style={{ fontSize: "3rem" }}>📂</span>
              <p>No files found. Try different filters or upload a file.</p>
            </div>
          ) : (
            <>
              <p className="results-count">{files.length} file{files.length !== 1 ? "s" : ""} found</p>
              <div className="file-grid">
                {files.map((f) => <FileCard key={f.id} file={f} />)}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Upload Modal ── */}
      {showModal && (
        <UploadModal
          subjects={subjects}
          onClose={() => setModal(false)}
          onSuccess={() => { loadFiles(); loadSubjects(); }}
        />
      )}
    </>
  );
}