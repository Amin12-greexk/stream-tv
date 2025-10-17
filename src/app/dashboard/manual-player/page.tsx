"use client";

import { useEffect, useState, useRef, useCallback } from "react";

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

type SendStatus = {
  device: string;
  status: "sending" | "success" | "error";
  message?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    let allMedia: Media[] = [];
    try {
      const mediaRes = await fetch("/api/media", { cache: "no-store" });
      if (mediaRes.ok) {
        allMedia = await mediaRes.json();
      } else {
        console.warn("Media API returned non-OK status:", mediaRes.status);
      }
    } catch (error) {
      console.warn("Failed to load media files:", error);
    }
    setMediaList(allMedia);

    let devices: Device[] = [];
    try {
      const deviceRes = await fetch("/api/devices", { cache: "no-store" });
      if (deviceRes.ok) {
        devices = await deviceRes.json();
      } else {
        console.warn("Devices API returned non-OK status:", deviceRes.status);
      }
    } catch (error) {
      console.warn("Failed to load devices:", error);
    }
    setDeviceList(devices);

    if (allMedia.length === 0 && devices.length === 0) {
      setError("Unable to load media and devices. You can still use the manual player if you upload media files.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    handleStop();
  }, [selectedMedia?.id]);

  function isDeviceOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = Date.now();
    return now - lastSeenTime < 60_000;
  }

  function getPlayerUrl(deviceCode: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/player?device=${deviceCode}`;
  }

  const sendMediaToDevice = useCallback(
    async (mediaId: string, deviceCode: string) => {
      if (!mediaId || !deviceCode) {
        alert("Please select both media and device");
        return;
      }

      const media = mediaList.find((m) => m.id === mediaId);
      const device = deviceList.find((d) => d.code === deviceCode);

      if (!media || !device) {
        alert("Invalid media or device selection");
        return;
      }

      if (!isDeviceOnline(device.lastSeen)) {
        const confirm = window.confirm(
          `Device "${device.name}" appears to be offline. Send anyway?`
        );
        if (!confirm) return;
      }

      setSendStatus({
        device: deviceCode,
        status: "sending",
        message: `Sending "${media.title}" to "${device.name}"...`,
      });

      try {
        const tempPlaylist = {
          items: [
            {
              id: media.id,
              type: media.type,
              url: `/api/stream/${media.filename}`,
              title: media.title,
              displayFit: displayFit,
              duration: media.type === "image" ? imageDuration : media.duration,
            },
          ],
        };

        const response = await fetch(`/api/player/send-media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceCode: deviceCode,
            playlist: tempPlaylist,
            playImmediately: true,
          }),
        });

        if (response.ok) {
          setSendStatus({
            device: deviceCode,
            status: "success",
            message: `Successfully sent "${media.title}" to "${device.name}"`,
          });
          setTimeout(() => setSendStatus(null), 3000);
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (error) {
        console.error("Send media error:", error);
        setSendStatus({
          device: deviceCode,
          status: "error",
          message: `Failed to send media to "${device.name}". ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
        setTimeout(() => setSendStatus(null), 5000);
      }
    },
    [mediaList, deviceList, displayFit, imageDuration]
  );

  const sendRemoteCommand = useCallback(
    async (deviceCode: string, command: string, params?: any) => {
      try {
        const response = await fetch(`/api/player/remote-command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceCode: deviceCode,
            command: command,
            params: params,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send command: ${response.status}`);
        }

        const device = deviceList.find((d) => d.code === deviceCode);
        setSendStatus({
          device: deviceCode,
          status: "success",
          message: `Command "${command}" sent to "${device?.name || deviceCode}"`,
        });

        setTimeout(() => setSendStatus(null), 2000);
      } catch (error) {
        console.error("Send command error:", error);
        setSendStatus({
          device: deviceCode,
          status: "error",
          message: `Failed to send command to device`,
        });
        setTimeout(() => setSendStatus(null), 3000);
      }
    },
    [deviceList]
  );

  const handleMediaSelect = useCallback(
    (mediaId: string) => {
      const media = mediaList.find((m) => m.id === mediaId);
      setSelectedMedia(media || null);
      setIsPlaying(false);

      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.load();
      }
    },
    [mediaList]
  );

  const handlePlay = useCallback(() => {
    if (!selectedMedia) {
      alert("Please select a media file first");
      return;
    }

    setIsPlaying(true);

    if (selectedMedia.type === "video") {
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch((err) => {
          console.error("Video play error:", err);
          setIsPlaying(false);
          alert("Failed to play video. Please check the file format.");
        });
      }
    } else if (selectedMedia.type === "image") {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
      }

      if (isLooping) {
        const startImageLoop = () => {
          imageTimerRef.current = setTimeout(() => {
            if (isPlaying) {
              startImageLoop();
            }
          }, imageDuration * 1000);
        };
        startImageLoop();
      }
    }
  }, [selectedMedia, isLooping, imageDuration, isPlaying]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);

    if (selectedMedia?.type === "video" && videoRef.current) {
      videoRef.current.pause();
    }

    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }, [selectedMedia]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (isLooping) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch((err) => {
          console.error("Video replay error:", err);
          setIsPlaying(false);
        });
      }
    } else {
      setIsPlaying(false);
    }
  }, [isLooping]);

  const handleVideoError = useCallback(() => {
    console.error("Video load error");
    setIsPlaying(false);
    alert("Failed to load video. Please check the file format and try again.");
  }, []);

  const handleImageError = useCallback(() => {
    console.error("Image load error");
    alert("Failed to load image. Please check the file format and try again.");
  }, []);

  const fitClass =
    displayFit === "cover"
      ? "object-cover"
      : displayFit === "stretch"
      ? "object-fill"
      : "object-contain";

  const stats = {
    totalMedia: mediaList.length,
    videos: mediaList.filter(m => m.type === "video").length,
    images: mediaList.filter(m => m.type === "image").length,
    onlineDevices: deviceList.filter(d => isDeviceOnline(d.lastSeen)).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading manual player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🎮</span>
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manual Player</h1>
                <p className="text-green-100 text-sm sm:text-base">Test and preview media content, then send directly to devices</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📁</span>
                  <span className="text-xs font-medium text-blue-700">MEDIA</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.totalMedia}</p>
                <p className="text-xs text-blue-600">Total files</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎬</span>
                  <span className="text-xs font-medium text-purple-700">VIDEO</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.videos}</p>
                <p className="text-xs text-purple-600">Video files</p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🖼️</span>
                  <span className="text-xs font-medium text-pink-700">IMAGE</span>
                </div>
                <p className="text-2xl font-bold text-pink-900">{stats.images}</p>
                <p className="text-xs text-pink-600">Image files</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🟢</span>
                  <span className="text-xs font-medium text-green-700">ONLINE</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.onlineDevices}</p>
                <p className="text-xs text-green-600">Devices ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-900 mb-1">Warning</h4>
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Send Status Message */}
        {sendStatus && (
          <div className={`rounded-2xl p-4 border ${
            sendStatus.status === "success"
              ? "bg-green-50 border-green-200"
              : sendStatus.status === "error"
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {sendStatus.status === "sending" && "⏳"}
                {sendStatus.status === "success" && "✅"}
                {sendStatus.status === "error" && "❌"}
              </span>
              <p className={`flex-1 text-sm font-medium ${
                sendStatus.status === "success"
                  ? "text-green-900"
                  : sendStatus.status === "error"
                  ? "text-red-900"
                  : "text-blue-900"
              }`}>{sendStatus.message}</p>
              <button
                onClick={() => setSendStatus(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column - Media Player */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Media Player Area */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>📺</span>
                  Preview Player
                </h3>
              </div>
              
              <div className="bg-gray-900 aspect-video w-full relative">
                {selectedMedia ? (
                  <>
                    {selectedMedia.type === "image" ? (
                      <img
                        key={selectedMedia.id}
                        src={`/api/stream/${selectedMedia.filename}`}
                        className={`${fitClass} w-full h-full`}
                        alt={selectedMedia.title}
                        onError={handleImageError}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        key={selectedMedia.id}
                        className={`${fitClass} w-full h-full`}
                        onEnded={handleVideoEnded}
                        onError={handleVideoError}
                        controls
                        loop={isLooping}
                      >
                        <source
                          src={`/api/stream/${selectedMedia.filename}`}
                          type={selectedMedia.mime}
                        />
                        Your browser does not support the video tag.
                      </video>
                    )}

                    {/* Playback Status */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                      <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
                      <span>{isPlaying ? "Playing" : "Paused"}</span>
                    </div>

                    {/* Media Info */}
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                      {selectedMedia.type === "video" ? "🎬" : "🖼️"} {selectedMedia.title}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">🎬</div>
                      <h3 className="text-xl font-bold text-gray-300 mb-2">No Media Selected</h3>
                      <p className="text-gray-500 text-sm">
                        {mediaList.length === 0
                          ? "Upload media files to start using the player"
                          : "Select a media file from the control panel"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Local Playback Controls */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>🎛️</span>
                  Local Preview Controls
                </h3>
              </div>
              
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handlePlay}
                    disabled={!selectedMedia || isPlaying}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center gap-2"
                  >
                    <span className="text-lg">▶️</span>
                    Play
                  </button>

                  <button
                    onClick={handlePause}
                    disabled={!selectedMedia || !isPlaying}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center gap-2"
                  >
                    <span className="text-lg">⏸️</span>
                    Pause
                  </button>

                  <button
                    onClick={handleStop}
                    disabled={!selectedMedia}
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center gap-2"
                  >
                    <span className="text-lg">⏹️</span>
                    Stop
                  </button>

                  <button
                    onClick={loadData}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <span className="text-lg">🔄</span>
                    Refresh
                  </button>

                  {selectedDevice && (
                    <a
                      href={getPlayerUrl(selectedDevice)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span className="text-lg">🔗</span>
                      Open Device
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Media Info */}
            {selectedMedia && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>📋</span>
                    Media Information
                  </h4>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📝</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Title</p>
                          <p className="font-bold text-gray-900">{selectedMedia.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">{selectedMedia.type === "video" ? "🎬" : "🖼️"}</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Type</p>
                          <p className="font-bold text-gray-900 capitalize">{selectedMedia.type}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📄</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Format</p>
                          <p className="font-bold text-gray-900">{selectedMedia.mime}</p>
                        </div>
                      </div>
                      
                      {selectedMedia.duration && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg">⏱️</span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Duration</p>
                            <p className="font-bold text-gray-900">{Math.round(selectedMedia.duration)}s</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Controls */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Media Selection */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>📁</span>
                  Select Media
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <select
                  onChange={(e) => handleMediaSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  value={selectedMedia?.id || ""}
                >
                  <option value="">Choose media file...</option>
                  {mediaList.length === 0 ? (
                    <option value="" disabled>No media available</option>
                  ) : (
                    mediaList.map((media) => (
                      <option key={media.id} value={media.id}>
                        {media.type === "video" ? "🎬" : "🖼️"} {media.title}
                      </option>
                    ))
                  )}
                </select>
                
                {mediaList.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <p className="mb-1">📤 No media files found</p>
                    <p>Upload files in the Media section</p>
                  </div>
                )}
              </div>
            </div>

            {/* Device Selection */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>📱</span>
                  Target Device
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
                >
                  <option value="">Select device...</option>
                  {deviceList.length === 0 ? (
                    <option value="" disabled>No devices registered</option>
                  ) : (
                    deviceList.map((device) => {
                      const online = isDeviceOnline(device.lastSeen);
                      return (
                        <option key={device.id} value={device.code}>
                          {online ? "🟢" : "🔴"} {device.name} ({device.code})
                          {device.group && ` [${device.group.name}]`}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {/* Send to Device */}
            {selectedMedia && selectedDevice && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>📤</span>
                    Send to Device
                  </h4>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>Media:</strong> {selectedMedia.title}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Device:</strong> {deviceList.find((d) => d.code === selectedDevice)?.name}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => sendMediaToDevice(selectedMedia.id, selectedDevice)}
                      disabled={sendStatus?.status === "sending"}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">📤</span>
                      {sendStatus?.status === "sending" ? "Sending..." : "Send & Play Now"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Remote Control */}
            {selectedDevice && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>🎛️</span>
                    Remote Control
                  </h4>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => sendRemoteCommand(selectedDevice, "play")}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>▶️</span>
                      Play
                    </button>
                    
                    <button
                      onClick={() => sendRemoteCommand(selectedDevice, "pause")}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>⏸️</span>
                      Pause
                    </button>
                    
                    <button
                      onClick={() => sendRemoteCommand(selectedDevice, "stop")}
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>⏹️</span>
                      Stop
                    </button>
                    
                    <button
                      onClick={() => sendRemoteCommand(selectedDevice, "mute")}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>🔇</span>
                      Mute
                    </button>
                    
                    <button
                      onClick={() => sendRemoteCommand(selectedDevice, "previous")}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>⏮️</span>
                      Prev
                    </button>
                    
                    <button
                      onClick={() => sendRemoteCommand(selectedDevice, "next")}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <span>⏭️</span>
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Display Settings */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>⚙️</span>
                  Display Settings
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                    <span>📐</span>
                    Display Mode
                  </label>
                  <select
                    value={displayFit}
                    onChange={(e) => setDisplayFit(e.target.value as "contain" | "cover" | "stretch")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent font-medium"
                  >
                    <option value="contain">📐 Contain (fit inside)</option>
                    <option value="cover">🔳 Cover (fill screen)</option>
                    <option value="stretch">↔️ Stretch (may distort)</option>
                  </select>
                </div>

                {selectedMedia?.type === "image" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                      <span>⏱️</span>
                      Image Duration: {imageDuration}s
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={1}
                        max={300}
                        value={imageDuration}
                        onChange={(e) => setImageDuration(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>1s</span>
                        <span>300s</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMedia?.type === "video" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                      <span>🔊</span>
                      Volume: {Math.round(volume * 100)}%
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isLooping}
                      onChange={(e) => setIsLooping(e.target.checked)}
                      className="h-5 w-5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔄</span>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-pink-600 transition-colors">
                        Loop playback continuously
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">💡</span>
              <h4 className="font-bold text-lg">Tips for Manual Player</h4>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎬</span>
                  <div>
                    <p><strong>Preview first:</strong> Test your media locally before sending to devices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">📱</span>
                  <div>
                    <p><strong>Device status:</strong> Green indicator means device is online and ready</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎛️</span>
                  <div>
                    <p><strong>Remote control:</strong> Send commands to devices in real-time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚙️</span>
                  <div>
                    <p><strong>Display modes:</strong> Adjust how content fits on different screen sizes</p>
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