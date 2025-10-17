// src/app/dashboard/media/page.tsx - ENHANCED VERSION

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");

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
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const error = await res.json();
        alert(error.error || "Upload gagal");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`Hapus "${title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        load();
      } else {
        alert("Hapus gagal");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Hapus gagal");
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "Ukuran tidak diketahui";
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

  // Filter media based on search and type
  const filteredList = list.filter(media => {
    const matchesSearch = media.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         media.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || media.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: list.length,
    images: list.filter(m => m.type === "image").length,
    videos: list.filter(m => m.type === "video").length,
    totalSize: list.reduce((acc, m) => acc + (m.sizeBytes || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🎬</span>
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Perpustakaan Media</h1>
                <p className="text-purple-100 text-sm sm:text-base">Kelola dan organisir file media Anda</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-white/90 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>{stats.total} file</span>
                  </div>
                  <span className="text-xs text-purple-200">{formatFileSize(stats.totalSize)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-medium text-blue-700">TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600">File media</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🖼️</span>
                  <span className="text-xs font-medium text-green-700">GAMBAR</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.images}</p>
                <p className="text-xs text-green-600">File gambar</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎥</span>
                  <span className="text-xs font-medium text-purple-700">VIDEO</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.videos}</p>
                <p className="text-xs text-purple-600">File video</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💾</span>
                  <span className="text-xs font-medium text-orange-700">STORAGE</span>
                </div>
                <p className="text-lg font-bold text-orange-900">{formatFileSize(stats.totalSize)}</p>
                <p className="text-xs text-orange-600">Digunakan</p>
              </div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari media..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Semua", icon: "📁" },
                  { key: "image", label: "Gambar", icon: "🖼️" },
                  { key: "video", label: "Video", icon: "🎥" }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setFilterType(filter.key as any)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      filterType === filter.key
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span className="hidden sm:inline">{filter.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={load}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-medium"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📤</span>
              <div>
                <h3 className="text-xl font-bold text-white">Upload Media Baru</h3>
                <p className="text-emerald-100 text-sm">Tambahkan file gambar atau video ke perpustakaan</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={onUpload} className="space-y-6">
              {/* Enhanced Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? "border-emerald-500 bg-emerald-50 scale-105" 
                    : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`text-6xl mb-4 transition-all ${dragActive ? 'animate-bounce' : ''}`}>
                  {files?.[0] ? "📁" : "☁️"}
                </div>
                
                {files?.[0] ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 inline-block">
                      <p className="font-bold text-emerald-900 mb-1">
                        📎 {files[0].name}
                      </p>
                      <p className="text-sm text-emerald-700">
                        {formatFileSize(files[0].size)} • {files[0].type}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xl font-bold text-gray-800 mb-2">
                        Seret & lepas file media di sini
                      </p>
                      <p className="text-gray-600 mb-6">atau klik untuk memilih file</p>
                    </div>
                    
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
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-4 rounded-xl cursor-pointer transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-xl">📂</span>
                      Pilih File
                    </label>
                    
                    <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">JPG</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">PNG</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">WebP</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">GIF</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">MP4</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">WebM</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title Input */}
              {files?.[0] && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-800">
                    📝 Judul Media
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                    placeholder="Masukkan judul untuk media ini"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                  />
                </div>
              )}

              {/* Upload Actions */}
              {files?.[0] && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl transition-all duration-200 font-bold text-lg shadow-lg disabled:shadow-none"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🚀</span>
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
                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-bold text-lg"
                  >
                    ❌ Batal
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-4 text-gray-600 font-medium">Memuat media files...</span>
            </div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">
              {searchTerm || filterType !== "all" ? "🔍" : "📁"}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm || filterType !== "all" ? "Tidak ada hasil" : "Belum ada file media"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== "all" 
                ? "Coba ubah pencarian atau filter Anda" 
                : "Upload file media pertama Anda untuk memulai"
              }
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>📸 Format yang didukung:</p>
              <p>Gambar: JPEG, PNG, WebP, GIF</p>
              <p>Video: MP4, WebM, OGG</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredList.map((media) => (
              <div key={media.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                {/* Media Preview */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {media.type === "image" ? (
                    <img
                      src={`/api/stream/${media.filename}`}
                      alt={media.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTlBM0FGIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+R2FtYmFyIFRpZGFrIERpdGVtdWthbjwvdGV4dD4KPC9zdmc+";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center text-white">
                        <div className="text-4xl mb-2">🎬</div>
                        <p className="text-sm font-medium">File Video</p>
                        {media.duration && (
                          <p className="text-xs opacity-75 mt-1">{formatDuration(media.duration)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                      media.type === "video" 
                        ? "bg-purple-500/90 text-white" 
                        : "bg-blue-500/90 text-white"
                    }`}>
                      {media.type === "video" ? "🎬 Video" : "🖼️ Gambar"}
                    </span>
                  </div>

                  {/* File Size Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-lg backdrop-blur-sm">
                      {formatFileSize(media.sizeBytes)}
                    </span>
                  </div>
                </div>

                {/* Enhanced Media Info */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-3 text-lg leading-tight line-clamp-2">
                    {media.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center justify-between py-1">
                      <span className="font-medium">Format:</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">
                        {media.mime.split('/')[1]?.toUpperCase()}
                      </span>
                    </div>
                    {media.duration && (
                      <div className="flex items-center justify-between py-1">
                        <span className="font-medium">Durasi:</span>
                        <span className="font-bold text-purple-600">{formatDuration(media.duration)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1">
                      <span className="font-medium">Upload:</span>
                      <span className="text-xs">{new Date(media.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Enhanced Actions */}
                  <div className="flex gap-2">
                    <a
                      href={`/api/stream/${media.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3 px-4 rounded-xl transition-all duration-200 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      👁️ Lihat
                    </a>
                    <button
                      onClick={() => onDelete(media.id, media.title)}
                      className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition-all duration-200 font-bold text-sm border border-red-200 hover:border-red-300"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">💡</span>
              <h4 className="font-bold text-lg">Tips untuk Hasil Terbaik</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📐</span>
                  <p><strong>Resolusi tinggi:</strong> Gunakan gambar 1920x1080 atau lebih tinggi untuk tampilan yang tajam</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">⚡</span>
                  <p><strong>Ukuran file:</strong> Jaga file video di bawah 100MB untuk pemutaran yang lancar</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🏷️</span>
                  <p><strong>Penamaan:</strong> Gunakan judul yang deskriptif untuk memudahkan identifikasi</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎯</span>
                  <p><strong>Format optimal:</strong> JPEG/PNG untuk gambar, MP4 untuk video</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}