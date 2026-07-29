"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
}

// ── Sidebar Categories ────────────────────────────────────────────────────────
const SIDEBAR_ITEMS: SidebarCategoryItem[] = [
  { id: "all",         label: "All My Files",   icon: "📁", category: "All" },
  { id: "pdf",         label: "My PDFs",        icon: "📄", category: "Documents",   type: "PDF" },
  { id: "word",        label: "My Word Docs",   icon: "📝", category: "Documents",   type: "Word" },
  { id: "ppt",         label: "My PowerPoint",  icon: "📊", category: "Documents",   type: "PowerPoint" },
  { id: "excel",       label: "My Excel Sheets",icon: "📈", category: "Documents",   type: "Excel" },
  { id: "videos",      label: "My Videos",      icon: "🎬", category: "Videos" },
  { id: "images",      label: "My Images",      icon: "🖼️", category: "Images" },
  { id: "assignments", label: "My Assignments", icon: "📋", category: "Assignments" },
  { id: "others",      label: "My Others",      icon: "📁", category: "Others" },
];

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
  if (!bytes || bytes === 0) return "0 B";
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
          Uploaded on {formatDate(file.created_at)}
        </p>
      </div>
      <div className="file-card-arrow">↗</div>
    </a>
  );
}

// ── Dedicated Dashboard Page Component ─────────────────────────────────────────
export default function UserDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<LMSUser | null>(null);
  const [authChecking, setAuthCheck]  = useState<boolean>(true);

  const [files,          setFiles]        = useState<LMSFile[]>([]);
  const [myFilesAll,     setMyFilesAll]   = useState<LMSFile[]>([]);
  const [subjects,       setSubjects]     = useState<Subject[]>([]);
  const [loading,        setLoading]      = useState<boolean>(true);
  const [showModal,      setModal]        = useState<boolean>(false);

  // Filters
  const [activeSidebarId, setActiveSidebar] = useState<string>("all");
  const [catFilter,       setCat]           = useState<string>("All");
  const [typeFilter,      setType]          = useState<string>("All");
  const [subFilter,       setSub]           = useState<string>("All");
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

  async function loadAllUserFiles(email: string) {
    try {
      const res  = await fetch(`/api/files?userEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) setMyFilesAll(data.files);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFilteredUserFiles() {
    if (!currentUser) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("userEmail", currentUser.email);

    if (catFilter  !== "All") params.set("category",  catFilter);
    if (typeFilter !== "All") params.set("type",       typeFilter);
    if (subFilter  !== "All") params.set("subject",    subFilter);
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
  }, []);

  useEffect(() => {
    if (!authChecking && currentUser) {
      loadAllUserFiles(currentUser.email);
      loadFilteredUserFiles();
    }
  }, [authChecking, currentUser, catFilter, typeFilter, subFilter, search]);

  function handleSelectSidebar(item: SidebarCategoryItem) {
    setActiveSidebar(item.id);
    setCat(item.category);
    setType(item.type || "All");
  }

  function getItemCount(item: SidebarCategoryItem): number {
    if (item.category === "All") return myFilesAll.length;
    if (item.id === "others" || item.category === "Others" || item.type === "Other") {
      return myFilesAll.filter(f => f.category === "Others" || f.type === "Other").length;
    }
    if (item.type) {
      return myFilesAll.filter(f => f.type === item.type).length;
    }
    return myFilesAll.filter(f => f.category === item.category).length;
  }

  const totalBytes = myFilesAll.reduce((sum, f) => sum + (f.size_bytes || 0), 0);

  if (authChecking) {
    return (
      <div className="state-msg" style={{ minHeight: "100vh" }}>
        <span className="spinner" />
        <p>Authenticating Dashboard…</p>
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
              <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="header-logo">🎓</span>
                <div>
                  <h1 className="header-title">CNCS LMS</h1>
                  <p className="header-sub">Learning Management System</p>
                </div>
              </Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Link href="/" className="btn-clear" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                🏠 Home
              </Link>

              {currentUser && (
                <div className="user-badge">
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

        {/* ── User Overview Stats Banner ── */}
        <div style={{ background: "rgba(26,29,39,0.8)", borderBottom: "1px solid var(--border)", padding: "20px 24px" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: "700", color: "#fff" }}>
                {currentUser?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)" }}>
                  {currentUser?.name}&apos;s Dashboard
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Category-wise overview of your uploaded files
                </p>
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "10px", textAlign: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#a5b4fc", display: "block" }}>{myFilesAll.length}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Files Uploaded</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "10px", textAlign: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#34d399", display: "block" }}>{formatBytes(totalBytes)}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Storage Used</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dashboard Body (Category Sidebar + Files Grid) ── */}
        <div className="dashboard-body">
          {/* Left Category Sidebar */}
          <aside className="sidebar">
            <h2 className="sidebar-title">My Categories</h2>
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

          {/* Main Content Area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Top Filter Bar */}
            <div className="filter-bar">
              <div className="filter-inner">
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    className="search-input"
                    placeholder="Search my files…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select className="filter-select" value={subFilter} onChange={(e) => setSub(e.target.value)}>
                  <option value="All">All Subjects</option>
                  {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                {(activeSidebarId !== "all" || subFilter !== "All" || search) && (
                  <button
                    className="btn-clear"
                    onClick={() => {
                      setActiveSidebar("all");
                      setCat("All");
                      setType("All");
                      setSub("All");
                      setSearch("");
                    }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* File Grid */}
            <main className="main">
              {loading ? (
                <div className="state-msg">
                  <span className="spinner" />
                  <p>Loading your files…</p>
                </div>
              ) : files.length === 0 ? (
                <div className="state-msg">
                  <span style={{ fontSize: "3rem" }}>📂</span>
                  <p>No files uploaded in this category yet. Click &quot;Upload File&quot; to add your first file!</p>
                </div>
              ) : (
                <>
                  <p className="results-count">{files.length} file{files.length !== 1 ? "s" : ""} in this category</p>
                  <div className="file-grid">
                    {files.map((f) => <FileCard key={f.id} file={f} />)}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <UploadModal
          subjects={subjects}
          defaultUploaderEmail={currentUser?.email || ""}
          onClose={() => setModal(false)}
          onSuccess={() => {
            if (currentUser) loadAllUserFiles(currentUser.email);
            loadFilteredUserFiles();
            loadSubjects();
          }}
        />
      )}
      {/* Storage Modal */}
      {showStorageModal && (
        <StorageModal onClose={() => setStorageModal(false)} />
      )}
    </>
  );
}
