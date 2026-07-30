"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import StorageModal from "@/app/components/StorageModal";
import UploadModal from "@/app/components/UploadModal";

// ── Types & Interfaces ────────────────────────────────────────────────────────
export interface LMSUser {
  id: number;
  name: string;
  email: string;
}

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

interface SidebarCategoryItem {
  id: string;
  label: string;
  icon: string;
  category: string;
  type?: string;
  isMyUploads?: boolean;
}

// ── Sidebar Category Configuration ───────────────────────────────────────────
const SIDEBAR_ITEMS: SidebarCategoryItem[] = [
  { id: "all",         label: "All Files",    icon: "📁", category: "All" },
  { id: "pdf",         label: "PDFs",         icon: "📄", category: "Documents",   type: "PDF" },
  { id: "word",        label: "Word Docs",    icon: "📝", category: "Documents",   type: "Word" },
  { id: "ppt",         label: "PowerPoint",   icon: "📊", category: "Documents",   type: "PowerPoint" },
  { id: "excel",       label: "Excel Sheets", icon: "📈", category: "Documents",   type: "Excel" },
  { id: "videos",      label: "Videos",       icon: "🎬", category: "Videos" },
  { id: "images",      label: "Images",       icon: "🖼️", category: "Images" },
  { id: "assignments", label: "Assignments",  icon: "📋", category: "Assignments" },
  { id: "others",      label: "Others",       icon: "📁", category: "Others" },
];

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
function FileCard({
  file,
  currentUser,
  onDeleteSuccess,
}: {
  file: LMSFile;
  currentUser: LMSUser | null;
  onDeleteSuccess?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const style = TYPE_COLORS[file.type] || TYPE_COLORS.Other;

  const isOwner =
    currentUser &&
    file.uploaded_by &&
    file.uploaded_by.trim().toLowerCase() === currentUser.email.trim().toLowerCase();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmDelete = window.confirm(`Are you sure you want to delete "${file.name}"?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files?id=${file.id}`, { method: "DELETE" });
      const data = await res.json();
      setIsDeleting(false);

      if (data.success) {
        if (onDeleteSuccess) onDeleteSuccess();
      } else {
        alert(data.error || "Failed to delete file.");
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      alert(err instanceof Error ? err.message : "Error deleting file.");
    }
  }

  return (
    <div
      className="file-card"
      style={{
        opacity: isDeleting ? 0.5 : 1,
        pointerEvents: isDeleting ? "none" : "auto",
      }}
    >
      <a
        href={file.drive_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          textDecoration: "none",
          color: "inherit",
          flex: 1,
          minWidth: 0,
        }}
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
      </a>

      <div className="file-card-actions">
        {isOwner && (
          <button
            type="button"
            className="btn-delete-file"
            title="Delete file"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "⏳" : "🗑️"}
          </button>
        )}
        <a
          href={file.drive_url}
          target="_blank"
          rel="noopener noreferrer"
          className="file-card-arrow"
          style={{ textDecoration: "none" }}
        >
          ↗
        </a>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<LMSUser | null>(null);
  const [authChecking, setAuthCheck]  = useState<boolean>(true);

  const [files,          setFiles]        = useState<LMSFile[]>([]);
  const [allFilesCount,  setAllCount]     = useState<LMSFile[]>([]);
  const [subjects,       setSubjects]     = useState<Subject[]>([]);
  const [loading,        setLoading]      = useState<boolean>(true);
  const [showModal,      setModal]        = useState<boolean>(false);

  // Active Category Sidebar
  const [activeSidebarId, setActiveSidebar] = useState<string>("all");
  const [catFilter,       setCat]           = useState<string>("All");
  const [typeFilter,      setType]          = useState<string>("All");
  const [subFilter,       setSub]           = useState<string>("All");
  const [personFilter,    setPerson]        = useState<string>("");
  const [search,          setSearch]        = useState<string>("");
  const [showStorageModal, setStorageModal] = useState<boolean>(false);

  async function checkUserAuth() {
    try {
      const res  = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
        setAuthCheck(false);
      } else {
        router.push("/login");
      }
    } catch (err) {
      router.push("/login");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function loadSubjects() {
    try {
      const res  = await fetch("/api/subjects");
      const data = await res.json();
      if (data.success) setSubjects(data.subjects);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAllFilesCounts() {
    try {
      const res  = await fetch(`/api/files`);
      const data = await res.json();
      if (data.success) setAllCount(data.files);
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

  useEffect(() => {
    checkUserAuth();
    loadSubjects();
    loadAllFilesCounts();
  }, []);

  useEffect(() => {
    if (!authChecking) {
      loadFiles();
    }
  }, [authChecking, catFilter, typeFilter, subFilter, personFilter, search]);

  function handleUserBadgeClick() {
    router.push("/dashboard");
  }

  function handleSelectSidebar(item: SidebarCategoryItem) {
    setActiveSidebar(item.id);
    if (item.isMyUploads && currentUser) {
      setPerson(currentUser.email);
      setCat("All");
      setType("All");
    } else {
      setPerson("");
      setCat(item.category);
      setType(item.type || "All");
    }
  }

  function getItemCount(item: SidebarCategoryItem): number {
    if (item.isMyUploads && currentUser) {
      return allFilesCount.filter(
        (f) => f.uploaded_by?.toLowerCase() === currentUser.email.toLowerCase()
      ).length;
    }
    if (item.category === "All") return allFilesCount.length;
    if (item.id === "others" || item.category === "Others" || item.type === "Other") {
      return allFilesCount.filter(f => f.category === "Others" || f.type === "Other").length;
    }
    if (item.type) {
      return allFilesCount.filter(f => f.type === item.type).length;
    }
    return allFilesCount.filter(f => f.category === item.category).length;
  }

  if (authChecking) {
    return (
      <div className="state-msg" style={{ minHeight: "100vh" }}>
        <span className="spinner" />
        <p>Authenticating…</p>
      </div>
    );
  }

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

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {currentUser && (
                <div
                  className="user-badge"
                  onClick={handleUserBadgeClick}
                  style={{ cursor: "pointer" }}
                  title="Click to view all your uploaded files"
                >
                  <div className="user-avatar">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{currentUser.name}</span>
                    <span className="user-email">{currentUser.email}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn-clear"
                onClick={() => setStorageModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                ☁️ Drive Storage
              </button>

              <button className="btn-primary" onClick={() => setModal(true)}>
                ⬆️ Upload File
              </button>

              <button type="button" className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ── Dashboard Body (Sidebar + Content) ── */}
        <div className="dashboard-body">
          {/* ── Left Sidebar Navigation ── */}
          <aside className="sidebar">
            <h2 className="sidebar-title">Categories</h2>
            <nav className="sidebar-nav">
              {SIDEBAR_ITEMS.map((item) => {
                const isActive = activeSidebarId === item.id;
                const count    = getItemCount(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectSidebar(item)}
                  >
                    <span className="sidebar-item-label">
                      <span className="sidebar-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="sidebar-count">{count}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Main Content Area ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* ── Top Filter Bar ── */}
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
                {(activeSidebarId !== "all" || subFilter !== "All" || personFilter || search) && (
                  <button
                    className="btn-clear"
                    onClick={() => {
                      setActiveSidebar("all");
                      setCat("All");
                      setType("All");
                      setSub("All");
                      setPerson("");
                      setSearch("");
                    }}
                  >
                    ✕ Clear Filters
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
                  <p>No files found in this category. Upload a file or change filters.</p>
                </div>
              ) : (
                <>
                  <p className="results-count">{files.length} file{files.length !== 1 ? "s" : ""} found</p>
                  <div className="file-grid">
                    {files.map((f) => (
                      <FileCard
                        key={f.id}
                        file={f}
                        currentUser={currentUser}
                        onDeleteSuccess={() => {
                          loadFiles();
                          loadAllFilesCounts();
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {showModal && (
        <UploadModal
          subjects={subjects}
          defaultUploaderEmail={currentUser?.email || ""}
          onClose={() => setModal(false)}
          onSuccess={() => { loadFiles(); loadAllFilesCounts(); loadSubjects(); }}
        />
      )}
      {/* ── Storage Modal ── */}
      {showStorageModal && (
        <StorageModal onClose={() => setStorageModal(false)} />
      )}
    </>
  );
}