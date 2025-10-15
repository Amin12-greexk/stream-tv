"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  type: "image" | "video";
  url: string;
  title?: string;
  displayFit: "contain" | "cover" | "stretch";
  duration?: number;
};

type RemoteCommand = {
  id: string;
  command: string;
  params?: any;
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
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(true);
  
  const etagRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      setDevice(searchParams.get("device") || "demo");
    }
  }, []);

  // Remote command execution
  const executeCommand = useCallback((cmd: RemoteCommand) => {
    console.log("Executing remote command:", cmd);
    
    switch (cmd.command) {
      case "play":
        if (videoRef.current && !isPlaying) {
          videoRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
        break;
        
      case "pause":
        if (videoRef.current && isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        break;
        
      case "stop":
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          setIsPlaying(false);
        }
        break;
        
      case "next":
        setIdx((i) => (i + 1) % items.length);
        break;
        
      case "previous":
        setIdx((i) => (i - 1 + items.length) % items.length);
        break;
        
      case "goto":
        if (cmd.params?.index !== undefined) {
          const newIdx = parseInt(cmd.params.index);
          if (newIdx >= 0 && newIdx < items.length) {
            setIdx(newIdx);
          }
        }
        break;
        
      case "volume":
        if (cmd.params?.level !== undefined) {
          const vol = parseFloat(cmd.params.level);
          if (vol >= 0 && vol <= 1) {
            setVolume(vol);
            if (videoRef.current) {
              videoRef.current.volume = vol;
            }
          }
        }
        break;
        
      case "mute":
        setVolume(0);
        if (videoRef.current) {
          videoRef.current.volume = 0;
        }
        break;
        
      case "unmute":
        setVolume(0.5);
        if (videoRef.current) {
          videoRef.current.volume = 0.5;
        }
        break;
        
      case "seek":
        if (videoRef.current && cmd.params?.time !== undefined) {
          videoRef.current.currentTime = parseFloat(cmd.params.time);
        }
        break;
        
      default:
        console.warn("Unknown command:", cmd.command);
    }
    
    // Mark command as executed
    fetch(`/api/player/poll-commands?device=${device}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        commandId: cmd.id, 
        status: "executed" 
      })
    }).catch(console.error);
  }, [device, items.length, isPlaying]);

  // Poll for remote commands
  useEffect(() => {
    if (!device || !remoteControlEnabled) return;
    
    const pollCommands = async () => {
      try {
        const res = await fetch(`/api/player/poll-commands?device=${device}`, {
          cache: "no-store"
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.commands && data.commands.length > 0) {
            // Execute all pending commands
            data.commands.forEach((cmd: RemoteCommand) => {
              executeCommand(cmd);
            });
          }
        }
      } catch (error) {
        console.error("Failed to poll commands:", error);
      }
    };

    // Poll every 2 seconds for commands
    const interval = setInterval(pollCommands, 2000);
    
    return () => clearInterval(interval);
  }, [device, remoteControlEnabled, executeCommand]);

  const nextItem = useCallback(() => {
    setIdx((i) => (i + 1) % items.length);
  }, [items.length]);

  const previousItem = useCallback(() => {
    setIdx((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const adjustVolume = useCallback((delta: number) => {
    setVolume(prev => {
      const newVolume = Math.max(0, Math.min(1, prev + delta));
      if (videoRef.current) {
        videoRef.current.volume = newVolume;
      }
      return newVolume;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setVolume(prev => {
      const newVolume = prev > 0 ? 0 : 0.5;
      if (videoRef.current) {
        videoRef.current.volume = newVolume;
      }
      return newVolume;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      setShowControls(true);
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextItem();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previousItem();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
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
  }, [togglePlayPause, nextItem, previousItem, adjustVolume, toggleMute, toggleFullscreen]);

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
        setTimeout(() => fetchPlaylist(), 5000 * retryCountRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [device]);

  useEffect(() => {
    if (!device) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/player/heartbeat?device=${device}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerVer: "web-1.5-remote" }),
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [device]);

  useEffect(() => {
    if (!device) return;
    
    fetchPlaylist();
    const pollInterval = setInterval(() => fetchPlaylist(), 45000);

    return () => clearInterval(pollInterval);
  }, [device, fetchPlaylist]);

  useEffect(() => {
    if (!items.length) return;
    const current = items[idx];

    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }

    if (current?.type === "image") {
      imageTimerRef.current = setTimeout(() => {
        nextItem();
      }, (current.duration ?? 8) * 1000);
    }

    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
    };
  }, [idx, items, nextItem]);

  const handleMediaError = useCallback((mediaType: string) => {
    console.error(`${mediaType} load error:`, items[idx]?.url);
    setTimeout(() => nextItem(), 1000);
  }, [items, idx, nextItem]);

  const handleVideoEnd = useCallback(() => {
    nextItem();
  }, [nextItem]);

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [idx, volume]);

  if (!device) {
    return (
      <div className="w-screen h-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Initializing Player...</div>
        </div>
      </div>
    );
  }

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
      {current.type === "image" ? (
        <img
          key={`img-${current.id}-${idx}`}
          src={current.url}
          className={`${fitClass} w-full h-full`}
          alt={current.title || "slide"}
          onError={() => handleMediaError("Image")}
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
          onEnded={handleVideoEnd}
          onError={() => handleMediaError("Video")}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          controls={false}
          preload="metadata"
        />
      )}

      {/* Remote Control Indicator */}
      {remoteControlEnabled && (
        <div className="absolute top-3 left-3 bg-green-600/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Remote Control Active
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="text-lg font-medium">
                  {current.title || `${current.type} ${idx + 1}`}
                </div>
                <div className="text-sm text-gray-300">
                  {idx + 1} of {items.length}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-300">
                  Device: {device}
                </div>
                <button
                  onClick={() => setRemoteControlEnabled(!remoteControlEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    remoteControlEnabled 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  {remoteControlEnabled ? "🟢 Remote ON" : "⚪ Remote OFF"}
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <button
                  onClick={previousItem}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors backdrop-blur-sm"
                  title="Previous (←)"
                >
                  ⏮️
                </button>
                
                {current.type === "video" && (
                  <button
                    onClick={togglePlayPause}
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors backdrop-blur-sm"
                    title="Play/Pause (Space)"
                  >
                    {isPlaying ? "⏸️" : "▶️"}
                  </button>
                )}
                
                <button
                  onClick={nextItem}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors backdrop-blur-sm"
                  title="Next (→)"
                >
                  ⏭️
                </button>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-300">
                  {current.type === "video" ? "🎬 Video" : "🖼️ Image"}
                </div>
                <div className="text-xs text-gray-400">
                  {current.displayFit}
                </div>
              </div>

              {current.type === "video" && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors backdrop-blur-sm"
                    title="Mute/Unmute (M)"
                  >
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur-sm">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      title="Volume (↑/↓)"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                    <span className="text-xs text-gray-300 w-10 text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-300 pointer-events-auto">
            <div className="font-semibold mb-2">⌨️ Keyboard Shortcuts:</div>
            <div className="space-y-1">
              <div><kbd className="bg-white/20 px-1 rounded">Space</kbd> Play/Pause</div>
              <div><kbd className="bg-white/20 px-1 rounded">←</kbd> <kbd className="bg-white/20 px-1 rounded">→</kbd> Prev/Next</div>
              <div><kbd className="bg-white/20 px-1 rounded">↑</kbd> <kbd className="bg-white/20 px-1 rounded">↓</kbd> Volume</div>
              <div><kbd className="bg-white/20 px-1 rounded">M</kbd> Mute</div>
              <div><kbd className="bg-white/20 px-1 rounded">F</kbd> Fullscreen</div>
            </div>
          </div>
        </div>
      )}

      {!showControls && items.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
          {idx + 1} / {items.length}
        </div>
      )}

      {retryCountRef.current > 0 && retryCountRef.current < maxRetries && (
        <div className="absolute top-4 left-4 bg-yellow-600/90 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg">
          ⚠️ Connection issues - retrying ({retryCountRef.current}/{maxRetries})...
        </div>
      )}

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
        kbd {
          font-family: monospace;
          font-size: 0.9em;
        }
      `}</style>
    </main>
  );
}