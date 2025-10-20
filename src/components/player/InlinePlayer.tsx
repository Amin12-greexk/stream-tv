"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ManualItem = {
  id: string;
  type: "image" | "video";
  url: string;
  title?: string;
  displayFit: "contain" | "cover" | "stretch";
  duration?: number; // used for images
};

type Props = {
  items: ManualItem[];
  startIndex?: number;
};

export default function InlinePlayer({ items, startIndex = 0 }: Props) {
  const [idx, setIdx] = useState(startIndex);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = items[idx];

  const nextItem = useCallback(() => {
    if (!items.length) return;
    setIdx((i) => (i + 1) % items.length);
  }, [items.length]);

  const previousItem = useCallback(() => {
    if (!items.length) return;
    setIdx((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const togglePlayPause = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const adjustVolume = useCallback((delta: number) => {
    setVolume((prev) => {
      const v = Math.max(0, Math.min(1, prev + delta));
      if (videoRef.current) {
        videoRef.current.volume = v;
        videoRef.current.muted = v === 0;
      }
      return v;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setVolume((prev) => {
      const v = prev > 0 ? 0 : 0.5;
      if (videoRef.current) {
        videoRef.current.volume = v;
        videoRef.current.muted = v === 0;
      }
      return v;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current || videoRef.current || document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el?.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = volume === 0;
    }
  }, [idx, volume]);

  // image auto-advance
  useEffect(() => {
    if (!items.length) return;
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
    const cur = items[idx];
    if (cur?.type === "image") {
      imageTimerRef.current = setTimeout(() => {
        nextItem();
      }, (cur.duration ?? 8) * 1000);
    }
    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
    };
  }, [idx, items, nextItem]);

  // show/hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      const t = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(t);
    };
    const onKey = (e: KeyboardEvent) => {
      setShowControls(true);
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (current?.type === "video") togglePlayPause();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextItem();
          break;
        case "ArrowLeft":
          e.preventDefault();
          previousItem();
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleMouseMove);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleMouseMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [adjustVolume, nextItem, previousItem, toggleFullscreen, toggleMute, togglePlayPause, current]);

  if (!items.length) {
    return (
      <div className="w-full h-[70vh] bg-black grid place-items-center text-white">
        <div className="text-center">
          <div className="text-5xl mb-3">🧪</div>
          <div className="text-xl mb-2">No items loaded</div>
          <div className="text-gray-400">Add local files, pick from library, or paste URLs.</div>
        </div>
      </div>
    );
  }

  const fitClass =
    current.displayFit === "cover" ? "object-cover" :
    current.displayFit === "stretch" ? "object-fill" : "object-contain";

  return (
    <main ref={containerRef} className="w-full h-[70vh] bg-black overflow-hidden relative rounded-xl">
      {current.type === "image" ? (
        <img
          key={`img-${current.id}-${idx}`}
          src={current.url}
          className={`${fitClass} w-full h-full`}
          alt={current.title || "slide"}
          loading="eager"
        />
      ) : (
        <video
          ref={videoRef}
          key={`video-${current.id}-${idx}`}
          src={current.url}
          className={`${fitClass} w-full h-full`}
          autoPlay
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          onEnded={nextItem}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.volume = volume;
              videoRef.current.muted = volume === 0;
            }
          }}
        />
      )}

      {showControls && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 pointer-events-auto">
            <div className="flex items-center justify-between text-white text-sm">
              <div className="flex items-center gap-3">
                <div className="font-medium">{current.title || `${current.type} ${idx + 1}`}</div>
                <div className="text-gray-300">{idx + 1} / {items.length}</div>
              </div>
              <div className="flex items-center gap-2">
                {current.type === "video" && (
                  <button onClick={togglePlayPause} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full">
                    {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                  </button>
                )}
                <button onClick={toggleFullscreen} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full">⛶ Fullscreen</button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <button onClick={previousItem} className="bg-white/20 hover:bg-white/30 p-2 rounded-full">⏮️</button>
                <button onClick={nextItem} className="bg-white/20 hover:bg-white/30 p-2 rounded-full">⏭️</button>
              </div>
              {current.type === "video" && (
                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className="bg-white/20 hover:bg-white/30 p-2 rounded-full">
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-28 h-2 bg-white/20 rounded-lg cursor-pointer"
                    title="Volume"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
