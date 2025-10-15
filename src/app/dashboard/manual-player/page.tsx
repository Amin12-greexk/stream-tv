// File: src/app/dashboard/manual-player/page.tsx

"use client";
import { useEffect, useState, useRef } from "react";

type Media = {
  id: string;
  title: string;
  type: "image" | "video";
  filename: string;
  mime: string;
  duration?: number;
};

type Device = {
  id: string;
  name: string;
  code: string;
  lastSeen: string | null;
  group: { name: string } | null;
};

export default function ManualPlayerPage() {
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [deviceList, setDeviceList] = useState<Device[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [volume, setVolume] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayFit, setDisplayFit] = useState<"contain" | "cover" | "stretch">("contain");
  const [imageDuration, setImageDuration] = useState(8);
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load media and devices
  useEffect(() => {
    loadData();
  }, []);

  // Update video volume when volume state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  async function loadData() {
    setLoading(true);
    try {
      const [mediaRes, deviceRes] = await Promise.all([
        fetch("/api/media", { cache: "no-store" }),
        fetch("/api/devices", { cache: "no-store" })
      ]);

      if (mediaRes.ok) {
        const allMedia: Media[] = await mediaRes.json();
        setMediaList(allMedia);
      }

      if (deviceRes.ok) {
        const devices: Device[] = await deviceRes.json();
        setDeviceList(devices);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  function isDeviceOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = Date.now();
    return now - lastSeenTime < 60000; // Online if seen in last 60 seconds
  }

  function getPlayerUrl(deviceCode: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/player?device=${deviceCode}`;
  }

  function handleMediaSelect(mediaId: string) {
    const media = mediaList.find(m => m.id === mediaId);
    setSelectedMedia(media || null);
    setIsPlaying(false);
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }

  function handlePlay() {
    if (!selectedMedia) {
      alert("Please select a media file first");
      return;
    }

    setIsPlaying(true);

    if (selectedMedia.type === "video") {
      if (videoRef.current) {
        videoRef.current.play();
      }
    } else if (selectedMedia.type === "image") {
      // For images, start timer based on duration
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
      }
      
      if (isLooping) {
        const startImageLoop = () => {
          imageTimerRef.current = setTimeout(() => {
            if (isPlaying) {
              startImageLoop(); // Continue loop
            }
          }, imageDuration * 1000);
        };
        startImageLoop();
      }
    }
  }

  function handlePause() {
    setIsPlaying(false);
    
    if (selectedMedia?.type === "video" && videoRef.current) {
      videoRef.current.pause();
    }
    
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }

  function handleStop() {
    setIsPlaying(false);
    
    if (selectedMedia?.type === "video" && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }

  const handleVideoEnded = () => {
    if (isLooping) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else {
      setIsPlaying(false);
    }
  };

  const fitClass =
    displayFit === "cover" ? "object-cover" :
    displayFit === "stretch" ? "object-fill" :
    "object-contain";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading manual player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🎮</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Manual Player</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Test and preview media content before deploying to devices. Control playback, adjust settings, and monitor device status.
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-green-100">
          <span className="text-2xl">⚙️</span>
          <h3 className="text-xl font-semibold text-gray-900">Player Controls</h3>
        </div>
        
        {/* Media and Device Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <label htmlFor="media-select" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Select Media File
            </label>
            <select
              id="media-select"
              onChange={(e) => handleMediaSelect(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900"
              value={selectedMedia?.id || ""}
            >
              <option value="">-- Choose media file --</option>
              {mediaList.map((media) => (
                <option key={media.id} value={media.id}>
                  {media.type === "video" ? "🎬" : "🖼️"} {media.title} ({media.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label htmlFor="device-select" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Target Device (Optional)
            </label>
            <select
              id="device-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900"
            >
              <option value="">🖥️ Preview locally</option>
              {deviceList.map((device) => {
                const online = isDeviceOnline(device.lastSeen);
                return (
                  <option key={device.id} value={device.code}>
                    {online ? "🟢" : "🔴"} {device.name} ({device.code})
                    {device.group && ` [${device.group.name}]`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Display Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-3">
            <label htmlFor="display-fit" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Display Mode
            </label>
            <select
              id="display-fit"
              value={displayFit}
              onChange={(e) => setDisplayFit(e.target.value as "contain" | "cover" | "stretch")}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900"
            >
              <option value="contain">📐 Contain (fit inside)</option>
              <option value="cover">🔳 Cover (fill screen)</option>
              <option value="stretch">↔️ Stretch (may distort)</option>
            </select>
          </div>

          {selectedMedia?.type === "image" && (
            <div className="space-y-3">
              <label htmlFor="image-duration" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">⏱️</span>
                Image Duration
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="image-duration"
                  type="number"
                  min="1"
                  max="300"
                  value={imageDuration}
                  onChange={(e) => setImageDuration(Number(e.target.value))}
                  className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900"
                />
                <span className="text-sm text-gray-600 font-medium">seconds</span>
              </div>
            </div>
          )}

          {selectedMedia?.type === "video" && (
            <div className="space-y-3">
              <label htmlFor="volume-slider" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">🔊</span>
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          )}
        </div>

        {/* Loop Control */}
        <div className="flex items-center gap-3 mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <input
            id="loop-checkbox"
            type="checkbox"
            checked={isLooping}
            onChange={(e) => setIsLooping(e.target.checked)}
            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="loop-checkbox" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span className="text-lg">🔄</span>
            Loop playback continuously
          </label>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-green-100">
          <button
            onClick={handlePlay}
            disabled={!selectedMedia || isPlaying}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <span className="text-lg">▶️</span>
            Play
          </button>
          
          <button
            onClick={handlePause}
            disabled={!selectedMedia || !isPlaying}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <span className="text-lg">⏸️</span>
            Pause
          </button>
          
          <button
            onClick={handleStop}
            disabled={!selectedMedia}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            <span className="text-lg">⏹️</span>
            Stop
          </button>

          {selectedDevice && (
            <a
              href={getPlayerUrl(selectedDevice)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="text-lg">🔗</span>
              Open on Device
            </a>
          )}

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span className="text-lg">🔄</span>
            Refresh
          </button>
        </div>

        {/* Selected Media Info */}
        {selectedMedia && (
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <span className="text-xl">📋</span>
              Selected Media Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Title:</span>
                  <span className="text-gray-900">{selectedMedia.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {selectedMedia.type === "video" ? "🎬" : "🖼️"}
                    {selectedMedia.type}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Format:</span>
                  <span className="text-gray-900">{selectedMedia.mime}</span>
                </div>
                {selectedMedia.duration && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Duration:</span>
                    <span className="text-gray-900">{Math.round(selectedMedia.duration)}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Player Area */}
      <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 aspect-video w-full relative">
          {selectedMedia ? (
            <>
              {selectedMedia.type === "image" ? (
                <img
                  src={`/api/stream/${selectedMedia.filename}`}
                  className={`${fitClass} w-full h-full`}
                  alt={selectedMedia.title}
                  onError={() => alert("Failed to load image")}
                />
              ) : (
                <video
                  ref={videoRef}
                  key={selectedMedia.id}
                  className={`${fitClass} w-full h-full`}
                  src={`/api/stream/${selectedMedia.filename}`}
                  onEnded={handleVideoEnded}
                  onError={() => alert("Failed to load video")}
                  controls
                  loop={isLooping}
                />
              )}
              
              {/* Playback Status Indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
                <span>{isPlaying ? "Playing" : "Paused"}</span>
              </div>

              {/* Media Info Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
                {selectedMedia.type === "video" ? "🎬" : "🖼️"} {selectedMedia.title}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-8xl mb-6">🎬</div>
                <p className="text-xl font-medium mb-2">No Media Selected</p>
                <p className="text-gray-500">Choose a media file from the dropdown above to start preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Status Panel */}
      {deviceList.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📱</span>
            <h3 className="text-xl font-semibold text-gray-900">Available Devices</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {deviceList.filter(d => isDeviceOnline(d.lastSeen)).length} online
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deviceList.map((device) => {
              const online = isDeviceOnline(device.lastSeen);
              return (
                <div
                  key={device.id}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    selectedDevice === device.code
                      ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                      : "border-gray-200 bg-gray-50 hover:border-green-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-4 h-4 rounded-full ${
                      online ? "bg-green-500 animate-pulse" : "bg-gray-400"
                    }`} />
                    <span className="font-semibold text-gray-900">{device.name}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Code:</span>
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">{device.code}</code>
                    </div>
                    {device.group && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Group:</span>
                        <span>{device.group.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <span className={online ? "text-green-600 font-medium" : "text-gray-500"}>
                        {online ? "Online" : "Offline"}
                      </span>
                    </div>
                    {device.lastSeen && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Last seen:</span>
                        <span>{new Date(device.lastSeen).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setSelectedDevice(selectedDevice === device.code ? "" : device.code)}
                    className={`w-full px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                      selectedDevice === device.code
                        ? "bg-green-600 text-white shadow-lg"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {selectedDevice === device.code ? "✓ Selected" : "Select Device"}
                  </button>
                </div>
              );
            })}
          </div>
          
          {deviceList.filter(d => isDeviceOnline(d.lastSeen)).length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📴</div>
              <p className="text-gray-600 font-medium">No devices are currently online</p>
              <p className="text-sm text-gray-500 mt-2">Devices will appear here when they connect to the system</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}