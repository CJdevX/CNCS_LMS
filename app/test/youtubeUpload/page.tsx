"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";

interface UploadResult {
  success: boolean;
  video?: {
    videoId: string;
    videoUrl: string;
    title: string;
  };
  error?: string;
  message?: string;
}

const PRIVACY_OPTIONS = [
  { value: "unlisted", label: "🔗 Unlisted — Anyone with the link can view" },
  { value: "private",  label: "🔒 Private — Only you can view" },
  { value: "public",   label: "🌐 Public — Visible to everyone on YouTube" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function YouTubeUploadPage() {
  const [selectedFile, setSelectedFile]     = useState<File | null>(null);
  const [isDragging, setIsDragging]         = useState(false);
  const [isUploading, setIsUploading]       = useState(false);
  const [uploadResult, setUploadResult]     = useState<UploadResult | null>(null);
  const [title, setTitle]                   = useState("");
  const [description, setDescription]       = useState("");
  const [privacyStatus, setPrivacyStatus]   = useState("unlisted");
  const [tags, setTags]                     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
      setUploadResult(null);
      // Auto-fill title from filename if empty
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } else if (file) {
      alert("Please select a valid video file.");
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim());
      formData.append("description", description);
      formData.append("privacyStatus", privacyStatus);
      formData.append("tags", tags);

      const response = await fetch("/api/test/youtubeUpload", {
        method: "POST",
        body: formData,
      });

      const result: UploadResult = await response.json();
      setUploadResult(result);
    } catch (err: unknown) {
      setUploadResult({
        success: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = selectedFile && title.trim() && !isUploading;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 font-sans">

      {/* Background glow blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-red-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-5%] right-[10%] w-[400px] h-[400px] bg-rose-500/8 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10 mt-6">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4 shadow-lg shadow-red-900/20">
            {/* YouTube icon */}
            <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.45 20.5 12 20.5 12 20.5s7.55 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Upload to YouTube</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            Upload large lecture videos to YouTube. The shareable link will be saved to the LMS — no Drive storage used.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">

          {/* Drag & Drop Zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200 select-none
              ${isDragging
                ? "border-red-500 bg-red-500/10 scale-[1.01]"
                : selectedFile
                ? "border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/8"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={onFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-200 text-base truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)} &bull; {selectedFile.type}</p>
                <span className="text-xs text-red-400 hover:underline mt-1 font-medium">Click or drag to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-300">
                  Drag &amp; drop your video here, or <span className="text-red-400 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500">MP4, MKV, MOV, AVI and other video formats</p>
              </div>
            )}
          </div>

          {/* Metadata Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Video Title <span className="text-red-400">*</span>
              </label>
              <input
                id="yt-video-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lecture 3: Edge Computing Fundamentals"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Description <span className="text-slate-600">(optional)</span>
              </label>
              <textarea
                id="yt-video-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of the video content..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all resize-none"
              />
            </div>

            {/* Privacy & Tags row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Privacy Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Privacy
                </label>
                <select
                  id="yt-privacy-status"
                  value={privacyStatus}
                  onChange={(e) => setPrivacyStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all appearance-none cursor-pointer"
                >
                  {PRIVACY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-slate-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tags <span className="text-slate-600">(comma-separated)</span>
                </label>
                <input
                  id="yt-video-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="lecture, networking, CNCS"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <button
            id="yt-upload-btn"
            onClick={handleUpload}
            disabled={!canUpload}
            className={`
              w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200
              flex items-center justify-center gap-2.5
              ${!canUpload
                ? "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
                : "bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white shadow-lg shadow-red-900/40"
              }
            `}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Uploading to YouTube… this may take a while</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.45 20.5 12 20.5 12 20.5s7.55 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
                </svg>
                <span>Upload to YouTube</span>
              </>
            )}
          </button>

          {/* Upload note */}
          {!isUploading && (
            <p className="text-center text-xs text-slate-600">
              Large videos may take several minutes to upload. Do not close this page.
            </p>
          )}

          {/* Result */}
          {uploadResult && (
            <div
              className={`p-5 rounded-xl border text-sm transition-all ${
                uploadResult.success
                  ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-300"
                  : "bg-rose-500/8 border-rose-500/25 text-rose-300"
              }`}
            >
              <div className="flex items-start gap-3">
                {uploadResult.success ? (
                  <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {uploadResult.success ? "🎉 Upload Successful!" : "Upload Failed"}
                  </p>
                  {uploadResult.success && uploadResult.video ? (
                    <div className="mt-2 space-y-1.5 text-xs text-emerald-200/80">
                      <p>
                        <span className="font-medium text-emerald-200">Title:</span>{" "}
                        {uploadResult.video.title}
                      </p>
                      <p>
                        <span className="font-medium text-emerald-200">Video ID:</span>{" "}
                        <code className="bg-emerald-950/50 px-1.5 py-0.5 rounded font-mono text-emerald-300">
                          {uploadResult.video.videoId}
                        </code>
                      </p>
                      <p className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-emerald-200">YouTube URL:</span>
                        <a
                          href={uploadResult.video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:text-red-300 underline underline-offset-2 break-all"
                        >
                          {uploadResult.video.videoUrl}
                        </a>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-rose-200/80">
                      {uploadResult.error || uploadResult.message || "Could not upload video to YouTube."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-red-400 transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
