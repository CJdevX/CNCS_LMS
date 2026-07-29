"use client";

import React, { useState, useEffect } from "react";

export interface StorageUserUsage {
  email: string;
  name: string;
  file_count: number;
  storage_bytes: number;
}

export interface StorageQuotaInfo {
  limitBytes: number;
  usageBytes: number;
  driveBytes: number;
  freeBytes: number;
  lmsTotalBytes: number;
  totalFiles: number;
  userEmail: string;
}

interface StorageModalProps {
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StorageModal({ onClose }: StorageModalProps) {
  const [quota, setQuota]     = useState<StorageQuotaInfo | null>(null);
  const [users, setUsers]     = useState<StorageUserUsage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError]     = useState<string>("");

  async function fetchStorageData() {
    try {
      const res  = await fetch("/api/storage");
      const data = await res.json();
      if (data.success) {
        setQuota(data.quota);
        setUsers(data.users);
      } else {
        setError(data.error || "Could not load storage details.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load storage.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStorageData();
  }, []);

  const usedPercent = quota && quota.limitBytes > 0
    ? Math.min(100, Math.max(0.1, (quota.usageBytes / quota.limitBytes) * 100))
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>☁️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Google Drive Storage Usage</h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                Real-time storage quota &amp; member consumption breakdown
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {loading ? (
            <div className="state-msg" style={{ minHeight: "200px" }}>
              <span className="spinner" />
              <p>Calculating Google Drive storage usage…</p>
            </div>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : quota ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Storage Bar Card */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem", fontWeight: "600" }}>
                  <span>Overall Drive Storage Used</span>
                  <span style={{ color: "var(--accent)" }}>
                    {formatBytes(quota.usageBytes)} / {formatBytes(quota.limitBytes)} ({usedPercent.toFixed(2)}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: "100%", height: "10px", background: "var(--bg-input)", borderRadius: "999px", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${usedPercent}%`,
                      background: "linear-gradient(90deg, #6366f1, #34d399)",
                      borderRadius: "999px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                  <span>Connected Account: <strong>{quota.userEmail}</strong></span>
                  <span>Free Space: <strong>{formatBytes(quota.freeBytes)}</strong></span>
                </div>
              </div>

              {/* Summary Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#a5b4fc", display: "block" }}>{quota.totalFiles}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>LMS Files</span>
                </div>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#34d399", display: "block" }}>{formatBytes(quota.lmsTotalBytes)}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>LMS Total Size</span>
                </div>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fbbf24", display: "block" }}>{users.length}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Active Contributors</span>
                </div>
              </div>

              {/* Everyone's Storage Usage Breakdown Table */}
              <div>
                <h3 style={{ fontSize: "0.92rem", fontWeight: "700", marginBottom: "10px", color: "var(--text-primary)" }}>
                  👥 Everyone&apos;s Storage Breakdown
                </h3>

                {users.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No files uploaded yet.</p>
                ) : (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                          <th style={{ padding: "10px 14px" }}>Member</th>
                          <th style={{ padding: "10px 14px", textAlign: "center" }}>Files</th>
                          <th style={{ padding: "10px 14px", textAlign: "right" }}>Storage Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, idx) => (
                          <tr key={u.email || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{u.name || u.email}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{u.email}</div>
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: "600", color: "#a5b4fc" }}>
                              {u.file_count}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: "700", color: "#34d399" }}>
                              {formatBytes(u.storage_bytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
