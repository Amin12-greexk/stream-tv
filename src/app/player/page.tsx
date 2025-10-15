// File: src/app/player/page.tsx

"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  type: "image" | "video";
  url: string;
  title?: string;
  displayFit: "contain" | "cover" | "stretch";
  duration?: number; // images, seconds
};

export default function PlayerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const etagRef = useRef<string | null>(null);

  // 1. Inisialisasi state device ke null
  const [device, setDevice] = useState<string | null>(null);

  // 2. Dapatkan kode device dari URL setelah komponen di-mount di client
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setDevice(searchParams.get("device") || "demo");
  }, []); // Dependency array kosong agar hanya berjalan sekali di client

  const fetchPlaylist = useCallback(async () => {
    // Jangan lakukan fetch jika device belum di-set
    if (!device) return;

    try {
      const res = await fetch(`/api/player/playlist?device=${device}`, {
        headers: etagRef.current ? { "If-None-Match": etagRef.current } : undefined,
        cache: "no-store",
      });

      if (res.status === 304) return; // No changes

      if (!res.ok) {
        setError("Failed to fetch playlist");
        setLoading(false);
        return;
      }

      const etag = res.headers.get("etag");
      const data = await res.json();

      if (etag) etagRef.current = etag;
      setItems(data.items || []);
      setIdx(0);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error or player is offline");
    } finally {
        setLoading(false);
    }
  }, [device]);

  // Kirim heartbeat secara berkala
  useEffect(() => {
    if (!device) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/player/heartbeat?device=${device}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerVer: "web-1.1" }),
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000); // Setiap 30 detik

    return () => clearInterval(heartbeatInterval);
  }, [device]);

  // Ambil playlist secara berkala
  useEffect(() => {
    if (!device) return;
    
    fetchPlaylist();
    const pollInterval = setInterval(fetchPlaylist, 45000); // Poll setiap 45 detik

    return () => clearInterval(pollInterval);
  }, [device, fetchPlaylist]);

  // Atur durasi untuk gambar
  useEffect(() => {
    if (!items.length) return;
    const current = items[idx];

    if (current.type === "image") {
      const timer = setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
      }, (current.duration ?? 8) * 1000);

      return () => clearTimeout(timer);
    }
  }, [idx, items]);

  // Tampilkan state inisialisasi awal
  if (!device) {
    return (
        <div className="w-screen h-screen bg-black text-white grid place-items-center">
            Initializing Player...
        </div>
    );
  }

  // State Loading
  if (loading) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading...</div>
          <div className="text-gray-400">Device: {device}</div>
        </div>
      </div>
    );
  }

  // State Error
  if (error) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2 text-red-500">Error</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <div className="text-gray-500 text-sm">Device: {device}</div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchPlaylist();
            }}
            className="mt-4 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // State tidak ada konten
  if (!items.length) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2">No Content</div>
          <div className="text-gray-400 mb-2">No playlist assigned to this device</div>
          <div className="text-gray-500 text-sm">Device: {device}</div>
        </div>
      </div>
    );
  }

  const current = items[idx];
  const fitClass =
    current.displayFit === "cover"
      ? "object-cover"
      : current.displayFit === "stretch"
      ? "object-fill"
      : "object-contain";

  return (
    <main className="w-screen h-screen bg-black overflow-hidden cursor-none relative">
      {/* Tampilan Media */}
      {current.type === "image" ? (
        <img
          src={current.url}
          className={`${fitClass} w-full h-full`}
          alt={current.title || "slide"}
          onError={() => {
            console.error("Image load error:", current.url);
            setIdx((i) => (i + 1) % items.length);
          }}
        />
      ) : (
        <video
          key={current.url}
          src={current.url}
          className={`${fitClass} w-full h-full`}
          autoPlay
          playsInline
          onEnded={() => setIdx((i) => (i + 1) % items.length)}
          onError={() => {
            console.error("Video load error:", current.url);
            setIdx((i) => (i + 1) % items.length);
          }}
          controls={false}
        />
      )}

      {/* Info Debug (hanya tampil di development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs p-2 rounded">
          Device: {device} | Item {idx + 1}/{items.length}
        </div>
      )}
    </main>
  );
}