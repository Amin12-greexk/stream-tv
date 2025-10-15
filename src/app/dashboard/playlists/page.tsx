// ===== src/app/dashboard/playlists/page.tsx - UPDATED WITH LOOP =====
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
  // ⬇️ BARU:
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
  
  // Form state
  const [playlistName, setPlaylistName] = useState("");
  
  // Media add form state
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [displayFit, setDisplayFit] = useState("contain");
  const [imageDuration, setImageDuration] = useState(8);
  // ⬇️ BARU:
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
      alert(error.error || "Failed to create playlist");
    }
  }

  async function deletePlaylist(id: string) {
    if (!confirm("Delete this playlist? This action cannot be undone.")) return;
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
        // ⬇️ sertakan loop
        loop: loopItem,
      }),
    });

    if (res.ok) {
      // reset form
      setSelectedMediaId("");
      setDisplayFit("contain");
      setImageDuration(8);
      setLoopItem(false); // reset
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

  const selectedPlaylistData = playlists.find(p => p.id === selectedPlaylist);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Playlists</h2>
          <p className="text-gray-600 mt-1">Create and manage content playlists</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          {showForm ? "Cancel" : "+ Create Playlist"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPlaylist} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h3 className="font-semibold text-lg mb-4">Create New Playlist</h3>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              placeholder="Playlist name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-500">Loading playlists...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Playlists List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-gray-700">Your Playlists</h3>
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className={`bg-white p-4 rounded-lg shadow-md border-2 cursor-pointer transition ${
                  selectedPlaylist === playlist.id
                    ? "border-green-500 shadow-lg"
                    : "border-gray-100 hover:border-green-200"
                }`}
                onClick={() => setSelectedPlaylist(playlist.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{playlist.name}</h4>
                    <div className="text-sm text-gray-500 mt-1">
                      {playlist.items.length} items • {getTotalDuration(playlist)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlaylist(playlist.id);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            {playlists.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No playlists yet. Create your first playlist above.
              </div>
            )}
          </div>

          {/* Playlist Details */}
          <div className="lg:col-span-2">
            {selectedPlaylistData ? (
              <div className="bg-white rounded-lg shadow-md border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedPlaylistData.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Total duration: {getTotalDuration(selectedPlaylistData)}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMediaForm(!showMediaForm)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      + Add Media
                    </button>
                  </div>

                  {showMediaForm && (
                    <form onSubmit={addMediaToPlaylist} className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Media
                        </label>
                        <select
                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                          value={selectedMediaId}
                          onChange={(e) => setSelectedMediaId(e.target.value)}
                          required
                        >
                          <option value="">Choose media...</option>
                          {media.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title} ({m.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Display Fit
                        </label>
                        <select
                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                          value={displayFit}
                          onChange={(e) => setDisplayFit(e.target.value)}
                        >
                          <option value="contain">Contain (fit inside)</option>
                          <option value="cover">Cover (fill screen)</option>
                          <option value="stretch">Stretch (may distort)</option>
                        </select>
                      </div>

                      {selectedMediaId && media.find(m => m.id === selectedMediaId)?.type === "image" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Display Duration (seconds)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={300}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            value={imageDuration}
                            onChange={(e) => setImageDuration(Number(e.target.value))}
                          />
                        </div>
                      )}

                      {/* ⬇️ BARU: opsi loop */}
                      {selectedMediaId && (
                        <div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={loopItem}
                              onChange={(e) => setLoopItem(e.target.checked)}
                              className="h-4 w-4 text-green-600 border-gray-300 rounded"
                            />
                            Loop media ini (🔁)
                          </label>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          Add to Playlist
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMediaForm(false);
                            setSelectedMediaId("");
                            setDisplayFit("contain");
                            setImageDuration(8);
                            setLoopItem(false); // reset
                          }}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Playlist Items */}
                <div className="divide-y divide-gray-100">
                  {selectedPlaylistData.items.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      No media in this playlist yet. Add some media to get started.
                    </div>
                  ) : (
                    selectedPlaylistData.items.map((item, index) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-gray-300 w-8 text-center">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-medium">{item.media.title}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="inline-flex items-center gap-1">
                                {item.media.type === "video" ? "🎬" : "🖼️"}
                                {item.media.type}
                              </span>
                              <span className="mx-2">•</span>
                              <span>{item.displayFit}</span>
                              <span className="mx-2">•</span>
                              <span>
                                {item.media.type === "video" 
                                  ? formatDuration(item.media.duration)
                                  : `${item.imageDuration || 8}s`
                                }
                              </span>
                              {/* ⬇️ BARU: indikator loop */}
                              {item.loop && <span className="mx-2">• 🔁</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={`/api/stream/${item.media.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 text-sm underline"
                            >
                              Preview
                            </a>
                            <button
                              onClick={() => removeItemFromPlaylist(selectedPlaylistData.id, item.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
                Select a playlist to view and edit its contents
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
