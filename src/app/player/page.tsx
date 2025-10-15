// File: src/app/player/page.tsx - FIXED VERSION with Audio Support

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
  const [device, setDevice] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const etagRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Get device code from URL after component mounts on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      setDevice(searchParams.get("device") || "demo");
    }
  }, []);

  // Hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Hide after 3 seconds
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      setShowControls(true);
      
      // Keyboard controls
      switch (e.key) {
        case ' ': // Spacebar - play/pause
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight': // Right arrow - next
          e.preventDefault();
          nextItem();
          break;
        case 'ArrowLeft': // Left arrow - previous
          e.preventDefault();
          previousItem();
          break;
        case 'ArrowUp': // Up arrow - volume up
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown': // Down arrow - volume down
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'm': // M - mute/unmute
          e.preventDefault();
          toggleMute();
          break;
        case 'f': // F - fullscreen (if supported)
          e.preventDefault();
          toggleFullscreen();
          break;
      }
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('click', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Update video volume when volume state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  const fetchPlaylist = useCallback(async () => {
    if (!device) return;

    try {
      const res = await fetch(`/api/player/playlist?device=${device}`, {
        headers: etagRef.current ? { "If-None-Match": etagRef.current } : undefined,
        cache: "no-store",
      });

      if (res.status === 304) {
        retryCountRef.current = 0;
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const etag = res.headers.get("etag");
      const data = await res.json();

      if (etag) etagRef.current = etag;
      
      const validItems = (data.items || []).filter((item: any) => 
        item && item.id && item.type && item.url
      );

      setItems(validItems);
      setIdx(0);
      setError(null);
      retryCountRef.current = 0;
      
    } catch (err) {
      console.error("Fetch error:", err);
      retryCountRef.current++;
      
      if (retryCountRef.current >= maxRetries) {
        setError(`Failed to fetch playlist after ${maxRetries} attempts.`);
      } else {
        setError(`Connection issue (attempt ${retryCountRef.current}/${maxRetries}). Retrying...`);
        setTimeout(fetchPlaylist, 5000 * retryCountRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [device]);

  // Send heartbeat periodically
  useEffect(() => {
    if (!device) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/player/heartbeat?device=${device}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerVer: "web-1.3" }),
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [device]);

  // Fetch playlist periodically
  useEffect(() => {
    if (!device) return;
    
    fetchPlaylist();
    const pollInterval = setInterval(fetchPlaylist, 45000);

    return () => clearInterval(pollInterval);
  }, [device, fetchPlaylist]);

  // Handle image duration
  useEffect(() => {
    if (!items.length) return;
    const current = items[idx];

    if (current?.type === "image") {
      const timer = setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
      }, (current.duration ?? 8) * 1000);

      return () => clearTimeout(timer);
    }
  }, [idx, items]);

  // Control functions
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  const nextItem = () => {
    setIdx((i) => (i + 1) % items.length);
  };

  const previousItem = () => {
    setIdx((i) => (i - 1 + items.length) % items.length);
  };

  const adjustVolume = (delta: number) => {
    setVolume(prev => Math.max(0, Math.min(1, prev + delta)));
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (volume > 0) {
        videoRef.current.volume = 0;
        setVolume(0);
      } else {
        videoRef.current.volume = 0.5;
        setVolume(0.5);
      }
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const handleMediaError = (mediaType: string) => {
    console.error(`${mediaType} load error:`, items[idx]?.url);
    setTimeout(nextItem, 1000);
  };

  const handleVideoEnd = () => {
    nextItem();
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  // Show initialization state
  if (!device) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Initializing Player...</div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading...</div>
          <div className="text-gray-400">Device: {device}</div>
          <div className="mt-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center max-w-md px-4">
          <div className="text-2xl mb-2 text-red-500">⚠️ Error</div>
          <div className="text-gray-400 mb-4 text-sm leading-relaxed">{error}</div>
          <div className="text-gray-500 text-sm mb-4">Device: {device}</div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                retryCountRef.current = 0;
                fetchPlaylist();
              }}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              🔄 Retry Now
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              ↻ Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No content state
  if (!items.length) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📺</div>
          <div className="text-2xl mb-2">No Content</div>
          <div className="text-gray-400 mb-2">No playlist assigned to this device</div>
          <div className="text-gray-500 text-sm">Device: {device}</div>
          <div className="mt-4 text-gray-600 text-xs">
            Checking for updates every 45 seconds...
          </div>
        </div>
      </div>
    );
  }

  const current = items[idx];
  if (!current) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️ Invalid Media</div>
          <div className="text-gray-400">Item {idx + 1} of {items.length}</div>
        </div>
      </div>
    );
  }

  const fitClass =
    current.displayFit === "cover"
      ? "object-cover"
      : current.displayFit === "stretch"
      ? "object-fill"
      : "object-contain";

  return (
    <main className="w-screen h-screen bg-black overflow-hidden relative">
      {/* Main Media Display */}
      {current.type === "image" ? (
        <img
          src={current.url}
          className={`${fitClass} w-full h-full`}
          alt={current.title || "slide"}
          onError={() => handleMediaError("Image")}
          loading="eager"
        />
      ) : (
        <video
          ref={videoRef}
          key={`${current.url}-${idx}`}
          src={current.url}
          className={`${fitClass} w-full h-full`}
          autoPlay
          playsInline
          onEnded={handleVideoEnd}
          onError={() => handleMediaError("Video")}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          controls={false} // We'll use custom controls
          preload="metadata"
          // Remove muted to allow audio
        />
      )}

      {/* Custom Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="text-lg font-medium">
                  {current.title || `${current.type} ${idx + 1}`}
                </div>
                <div className="text-sm text-gray-300">
                  {idx + 1} of {items.length}
                </div>
              </div>
              <div className="text-sm text-gray-300">
                Device: {device}
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              {/* Left Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={previousItem}
                  className="bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                >
                  ⏮️
                </button>
                
                {current.type === "video" && (
                  <button
                    onClick={togglePlayPause}
                    className="bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                  >
                    {isPlaying ? "⏸️" : "▶️"}
                  </button>
                )}
                
                <button
                  onClick={nextItem}
                  className="bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
                >
                  ⏭️
                </button>
              </div>

              {/* Center Info */}
              <div className="text-center">
                <div className="text-sm text-gray-300">
                  {current.type === "video" ? "🎬 Video" : "🖼️ Image"}
                </div>
                <div className="text-xs text-gray-400">
                  {current.displayFit}
                </div>
              </div>

              {/* Right Controls - Volume */}
              {current.type === "video" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors text-sm"
                  >
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none slider-thumb"
                    />
                    <span className="text-xs text-gray-300 w-8">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="absolute top-4 right-4 bg-black/50 rounded p-2 text-xs text-gray-300">
            <div>⌨️ Shortcuts:</div>
            <div>Space: Play/Pause</div>
            <div>←→: Previous/Next</div>
            <div>↑↓: Volume</div>
            <div>M: Mute</div>
            <div>F: Fullscreen</div>
          </div>
        </div>
      )}

      {/* Loading Next Media Indicator */}
      {items.length > 1 && !showControls && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {idx + 1} / {items.length}
        </div>
      )}

      {/* Error Recovery Overlay */}
      {retryCountRef.current > 0 && retryCountRef.current < maxRetries && (
        <div className="absolute top-4 left-4 bg-yellow-600/90 text-white text-sm px-3 py-2 rounded">
          ⚠️ Connection issues - retrying...
        </div>
      )}

      {/* Custom CSS for slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider-thumb::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </main>
  );
}