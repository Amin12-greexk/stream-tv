// src/app/dashboard/playlists/page.tsx - ENHANCED VERSION

"use client";
import { useEffect, useState } from "react";

type Media = {
  id: string;
  title: string;
  type: string;
  filename: string;
  mime: string;
  duration: number | null;
};

type PlaylistItem = {
  id: string;
  playlistId: string;
  mediaId: string;
  order: number;
  displayFit: string;
  imageDuration: number | null;
  media: Media;
  loop: boolean;
};

type Playlist = {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: string;
};

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state
  const [playlistName, setPlaylistName] = useState("");
  
  // Media add form state
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [displayFit, setDisplayFit] = useState("contain");
  const [imageDuration, setImageDuration] = useState(8);
  const [loopItem, setLoopItem] = useState(false);

  async function loadPlaylists() {
    const res = await fetch("/api/playlist", { cache: "no-store" });
    const data = await res.json();
    setPlaylists(data);
    setLoading(false);
  }

  async function loadMedia() {
    const res = await fetch("/api/media", { cache: "no-store" });
    const data = await res.json();
    setMedia(data);
  }

  useEffect(() => {
    loadPlaylists();
    loadMedia();
  }, []);

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playlistName }),
    });

    if (res.ok) {
      setPlaylistName("");
      setShowForm(false);
      loadPlaylists();
    } else {
      const error = await res.json();
      alert(error.error || "Gagal membuat playlist");
    }
  }

  async function deletePlaylist(id: string) {
    if (!confirm("Hapus playlist ini? Tindakan ini tidak dapat dibatalkan.")) return;
    const res = await fetch(`/api/playlist?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      loadPlaylists();
      if (selectedPlaylist === id) {
        setSelectedPlaylist(null);
      }
    }
  }

  async function addMediaToPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlaylist) return;

    const res = await fetch(`/api/playlist/${selectedPlaylist}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: selectedMediaId,
        displayFit,
        imageDuration:
          displayFit === "contain" || displayFit === "cover" ? imageDuration : null,
        loop: loopItem,
      }),
    });

    if (res.ok) {
      setSelectedMediaId("");
      setDisplayFit("contain");
      setImageDuration(8);
      setLoopItem(false);
      setShowMediaForm(false);
      loadPlaylists();
    }
  }

  async function removeItemFromPlaylist(playlistId: string, itemId: string) {
    const res = await fetch(`/api/playlist/${playlistId}/items?itemId=${itemId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      loadPlaylists();
    }
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getTotalDuration(playlist: Playlist): string {
    const totalSeconds = playlist.items.reduce((sum, item) => {
      if (item.media.type === "video") {
        return sum + (item.media.duration || 0);
      } else {
        return sum + (item.imageDuration || 8);
      }
    }, 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPlaylistData = playlists.find(p => p.id === selectedPlaylist);
  const totalPlaylists = playlists.length;
  const totalItems = playlists.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manajemen Playlist</h1>
                <p className="text-green-100 text-sm sm:text-base">Organisir dan atur konten media dalam playlist</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium border border-white/20"
              >
                <span className="text-xl">{showForm ? "❌" : "➕"}</span>
                <span>{showForm ? "Batal" : "Buat Playlist"}</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-medium text-blue-700">TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{totalPlaylists}</p>
                <p className="text-xs text-blue-600">Playlist</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎬</span>
                  <span className="text-xs font-medium text-green-700">ITEM</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{totalItems}</p>
                <p className="text-xs text-green-600">Media item</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📁</span>
                  <span className="text-xs font-medium text-purple-700">MEDIA</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{media.length}</p>
                <p className="text-xs text-purple-600">Tersedia</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✅</span>
                  <span className="text-xs font-medium text-orange-700">AKTIF</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{selectedPlaylist ? 1 : 0}</p>
                <p className="text-xs text-orange-600">Dipilih</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari playlist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <span className="text-2xl">➕</span>
                <div>
                  <h3 className="text-xl font-bold">Buat Playlist Baru</h3>
                  <p className="text-emerald-100 text-sm">Berikan nama untuk playlist Anda</p>
                </div>
              </div>
            </div>
            <form onSubmit={createPlaylist} className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  placeholder="Nama playlist"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold"
                  >
                    <span>✅</span>
                    Buat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-bold"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-4 text-gray-600 font-medium">Memuat playlist...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Playlists List */}
            <div className="xl:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>📋</span>
                    Daftar Playlist ({filteredPlaylists.length})
                  </h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {filteredPlaylists.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="font-medium mb-1">
                        {searchTerm ? "Tidak ada hasil" : "Belum ada playlist"}
                      </p>
                      <p className="text-sm">
                        {searchTerm ? "Coba kata kunci lain" : "Buat playlist pertama Anda"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {filteredPlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className={`rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                            selectedPlaylist === playlist.id
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 shadow-lg transform scale-105"
                              : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                          }`}
                          onClick={() => setSelectedPlaylist(playlist.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📋</span>
                                <h4 className="font-bold text-gray-900 truncate">{playlist.name}</h4>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <span>🎬</span>
                                  {playlist.items.length} item
                                </span>
                                <span className="flex items-center gap-1">
                                  <span>⏱️</span>
                                  {getTotalDuration(playlist)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(playlist.createdAt).toLocaleDateString('id-ID')}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePlaylist(playlist.id);
                              }}
                              className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Playlist Details */}
            <div className="xl:col-span-2">
              {selectedPlaylistData ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{selectedPlaylistData.name}</h3>
                        <div className="flex items-center gap-4 text-purple-100 text-sm">
                          <span>⏱️ Durasi: {getTotalDuration(selectedPlaylistData)}</span>
                          <span>🎬 {selectedPlaylistData.items.length} item</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowMediaForm(!showMediaForm)}
                        className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium border border-white/20"
                      >
                        <span>➕</span>
                        Tambah Media
                      </button>
                    </div>
                  </div>

                  {showMediaForm && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                      <form onSubmit={addMediaToPlaylist} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                              📁 Pilih Media
                            </label>
                            <select
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              value={selectedMediaId}
                              onChange={(e) => setSelectedMediaId(e.target.value)}
                              required
                            >
                              <option value="">Pilih media...</option>
                              {media.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.type === "video" ? "🎥" : "🖼️"} {m.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                              📐 Mode Tampilan
                            </label>
                            <select
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              value={displayFit}
                              onChange={(e) => setDisplayFit(e.target.value)}
                            >
                              <option value="contain">Contain (fit dalam layar)</option>
                              <option value="cover">Cover (isi penuh layar)</option>
                              <option value="stretch">Stretch (regangkan)</option>
                            </select>
                          </div>
                        </div>

                        {selectedMediaId && media.find(m => m.id === selectedMediaId)?.type === "image" && (
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                              ⏱️ Durasi Tampilan (detik)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={300}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              value={imageDuration}
                              onChange={(e) => setImageDuration(Number(e.target.value))}
                            />
                          </div>
                        )}

                        {selectedMediaId && (
                          <div className="bg-white rounded-xl p-4 border border-gray-300">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={loopItem}
                                onChange={(e) => setLoopItem(e.target.checked)}
                                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <div>
                                <span className="text-sm font-bold text-gray-800">🔁 Loop Media</span>
                                <p className="text-xs text-gray-600">Media akan diputar berulang-ulang</p>
                              </div>
                            </label>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold"
                          >
                            <span>✅</span>
                            Tambah ke Playlist
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMediaForm(false);
                              setSelectedMediaId("");
                              setDisplayFit("contain");
                              setImageDuration(8);
                              setLoopItem(false);
                            }}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-bold"
                          >
                            ❌ Batal
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Playlist Items */}
                  <div className="max-h-96 overflow-y-auto">
                    {selectedPlaylistData.items.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">
                        <div className="text-6xl mb-4">📭</div>
                        <h4 className="text-lg font-bold text-gray-800 mb-2">Playlist Kosong</h4>
                        <p className="text-gray-600 mb-4">Belum ada media dalam playlist ini</p>
                        <p className="text-sm text-gray-500">Klik "Tambah Media" untuk memulai</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {selectedPlaylistData.items.map((item, index) => (
                          <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center font-bold text-purple-600 text-lg">
                                {index + 1}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">
                                    {item.media.type === "video" ? "🎥" : "🖼️"}
                                  </span>
                                  <h4 className="font-bold text-gray-900 truncate">{item.media.title}</h4>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                                    {item.displayFit}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    ⏱️ {item.media.type === "video" 
                                      ? formatDuration(item.media.duration)
                                      : `${item.imageDuration || 8}s`
                                    }
                                  </span>
                                  {item.loop && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                                      🔁 Loop
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={`/api/stream/${item.media.filename}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                                >
                                  👁️ Lihat
                                </a>
                                <button
                                  onClick={() => removeItemFromPlaylist(selectedPlaylistData.id, item.id)}
                                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                                >
                                  🗑️ Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Pilih Playlist</h3>
                  <p className="text-gray-600 mb-4">Pilih playlist dari daftar di sebelah kiri untuk melihat dan mengedit isinya</p>
                  <p className="text-sm text-gray-500">Atau buat playlist baru untuk memulai</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">💡</span>
              <h4 className="font-bold text-lg">Tips Manajemen Playlist</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p><strong>Organisasi yang baik:</strong> Buat playlist berdasarkan tema atau lokasi tampilan</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <p><strong>Durasi optimal:</strong> Sesuaikan durasi tampilan gambar dengan konten (8-15 detik)</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔁</span>
                  <div>
                    <p><strong>Fitur Loop:</strong> Gunakan untuk konten yang perlu penekanan khusus</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">📐</span>
                  <div>
                    <p><strong>Mode tampilan:</strong> "Cover" untuk layar penuh, "Contain" untuk proporsional</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}