// src/app/dashboard/media/page.tsx - FIXED VERSION

"use client";
import { useEffect, useState } from "react";

type Media = {
  id: string;
  title: string;
  type: "image" | "video";
  filename: string;
  mime: string;
  duration: number | null;
  sizeBytes: number | null;
  createdAt: string;
  mediaTags: any[];
};

export default function MediaPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [dragActive, setDragActive] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/media", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setList(data);
      }
    } catch (error) {
      console.error("Failed to load media:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load(); 
  }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.[0]) return;
    
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("title", uploadTitle || files[0].name);
      
      const res = await fetch("/api/media", { method: "POST", body: fd });
      
      if (res.ok) {
        setFiles(null);
        setUploadTitle("");
        load();
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const error = await res.json();
        alert(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        load();
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed");
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(e.dataTransfer.files);
      setUploadTitle(e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, ""));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
          <p className="text-gray-600 mt-1">Upload and manage your media files</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {list.length} files
          </span>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
          >
            <span>🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-green-100">
          <span className="text-2xl">📤</span>
          <h3 className="text-xl font-semibold text-gray-900">Upload Media</h3>
        </div>

        <form onSubmit={onUpload} className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragActive 
                ? "border-green-500 bg-green-50" 
                : "border-gray-300 hover:border-green-400 hover:bg-green-50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-4xl mb-4">
              {files?.[0] ? "📁" : "☁️"}
            </div>
            
            {files?.[0] ? (
              <div>
                <p className="font-semibold text-gray-900 mb-2">
                  Selected: {files[0].name}
                </p>
                <p className="text-sm text-gray-600">
                  {formatFileSize(files[0].size)} • {files[0].type}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag & drop your media files here
                </p>
                <p className="text-gray-500 mb-4">or click to browse</p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    setFiles(e.target.files);
                    if (e.target.files?.[0]) {
                      setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="file-input"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg cursor-pointer transition-all duration-200 font-medium"
                >
                  Choose Files
                </label>
              </div>
            )}
          </div>

          {/* Title Input */}
          {files?.[0] && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media Title
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter a title for this media"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>
          )}

          {/* Upload Button */}
          {files?.[0] && (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Upload Media
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiles(null);
                  setUploadTitle("");
                  const fileInput = document.getElementById('file-input') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-12">
          <div className="flex items-center justify-center">
            <div className="spinner"></div>
            <span className="ml-3 text-gray-600">Loading media files...</span>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-12 text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Media Files</h3>
          <p className="text-gray-600 mb-6">Upload your first media file to get started</p>
          <p className="text-sm text-gray-500">
            Supported formats: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, OGG)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((media) => (
            <div key={media.id} className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden hover-lift">
              {/* Media Preview */}
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {media.type === "image" ? (
                  <img
                    src={`/api/stream/${media.filename}`}
                    alt={media.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTlBM0FGIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4=";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">🎬</div>
                      <p className="text-sm">Video File</p>
                      {media.duration && (
                        <p className="text-xs opacity-75">{formatDuration(media.duration)}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    media.type === "video" 
                      ? "bg-purple-100 text-purple-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {media.type === "video" ? "🎬 Video" : "🖼️ Image"}
                  </span>
                </div>
              </div>

              {/* Media Info */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2 truncate">{media.title}</h3>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center justify-between">
                    <span>Format:</span>
                    <span className="font-medium">{media.mime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{formatFileSize(media.sizeBytes)}</span>
                  </div>
                  {media.duration && (
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{formatDuration(media.duration)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Uploaded:</span>
                    <span className="font-medium">{new Date(media.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/stream/${media.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium text-sm"
                  >
                    👁️ Preview
                  </a>
                  <button
                    onClick={() => onDelete(media.id, media.title)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 font-medium text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Tips for Best Results</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Use high-quality images (1920x1080 or higher) for crisp display</li>
              <li>• Keep video files under 100MB for smooth playback</li>
              <li>• Supported formats: JPEG, PNG, WebP, GIF, MP4, WebM, OGG</li>
              <li>• Use descriptive titles to easily identify your media</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}