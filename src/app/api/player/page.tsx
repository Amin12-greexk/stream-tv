"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const etagRef = useRef<string | null>(null);
  const device = useMemo(() => new URLSearchParams(window.location.search).get("device") || "demo", []);

  const fetchPlaylist = useCallback(async () => {
    const res = await fetch(`/api/player/playlist?device=${device}`, {
      headers: etagRef.current ? { "If-None-Match": etagRef.current } : undefined,
      cache: "no-store",
    });
    if (res.status === 304) return;
    if (!res.ok) return;
    const etag = res.headers.get("etag");
    const data = await res.json();
    if (etag) etagRef.current = etag;
    setItems(data.items || []);
    setIdx(0);
  }, [device]);

  useEffect(() => {
    fetch(`/api/player/heartbeat?device=${device}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerVer: "web-1" }),
    }).catch(()=>{});
    fetchPlaylist();
    const t = setInterval(fetchPlaylist, 45000); // poll ~45s
    return () => clearInterval(t);
  }, [device, fetchPlaylist]);

  useEffect(() => {
    if (!items.length) return;
    const current = items[idx];
    if (current.type === "image") {
      const timer = setTimeout(() => setIdx((i) => (i + 1) % items.length), (current.duration ?? 8) * 1000);
      return () => clearTimeout(timer);
    }
  }, [idx, items]);

  if (!items.length) {
    return <div className="w-screen h-screen bg-black text-white grid place-items-center">No content</div>;
  }

  const current = items[idx];
  const fitClass =
    current.displayFit === "cover" ? "object-cover" :
    current.displayFit === "stretch" ? "object-fill" :
    "object-contain";

  return (
    <main className="w-screen h-screen bg-black overflow-hidden cursor-none">
      {current.type === "image" ? (
        <img
          src={current.url}
          className={`${fitClass} w-full h-full`}
          alt={current.title || "slide"}
          onError={() => setIdx((i) => (i + 1) % items.length)}
        />
      ) : (
        <video
          key={current.url}
          src={current.url}
          className={`${fitClass} w-full h-full`}
          autoPlay
          playsInline
          onEnded={() => setIdx((i) => (i + 1) % items.length)}
          onError={() => setIdx((i) => (i + 1) % items.length)}
          controls={false}
        />
      )}
    </main>
  );
}