// File: src/app/dashboard/manual-player/page.tsx

"use client";
import { useEffect, useState, useRef } from "react";

type Media = {
  id: string;
  title: string;
  type: "image" | "video";
  filename: string;
};

export default function ManualPlayerPage() {
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState(1); // Volume 0.0 (sunyi) sampai 1.0 (maks)
  const [isLooping, setIsLooping] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ambil daftar media video dari API
    async function loadMedia() {
      try {
        const res = await fetch("/api/media", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch media");
        const allMedia: Media[] = await res.json();
        // Saring hanya untuk video
        setMediaList(allMedia.filter(m => m.type === 'video'));
      } catch (error) {
        console.error(error);
        alert("Could not load media list.");
      }
    }
    loadMedia();
  }, []);
  
  // Efek untuk mengubah volume video saat state volume berubah
  useEffect(() => {
    if (videoRef.current) {
        videoRef.current.volume = volume;
    }
  }, [volume]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = e.target.value;
    setSelectedMediaUrl(url || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Manual Video Player</h2>
        <p className="text-gray-500">
          Select a single video to play it directly with loop and volume controls.
        </p>
      </div>

      {/* Panel Kontrol */}
      <div className="p-4 border rounded-lg space-y-4">
        <div>
          <label htmlFor="media-select" className="block text-sm font-medium mb-1">
            1. Select Video
          </label>
          <select
            id="media-select"
            onChange={handleSelectChange}
            className="w-full p-2 border rounded-md"
            defaultValue=""
          >
            <option value="" disabled>-- Choose a video --</option>
            {mediaList.map((media) => (
              <option key={media.id} value={`/api/stream/${media.filename}`}>
                {media.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="volume-slider" className="block text-sm font-medium mb-1">
            2. Adjust Volume: {Math.round(volume * 100)}%
          </label>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center gap-2">
            <input
                id="loop-checkbox"
                type="checkbox"
                checked={isLooping}
                onChange={(e) => setIsLooping(e.target.checked)}
                className="h-4 w-4"
            />
            <label htmlFor="loop-checkbox" className="text-sm font-medium">
                3. Loop Video
            </label>
        </div>
      </div>

      {/* Area Pemutar Video */}
      <div className="bg-black aspect-video w-full rounded-lg overflow-hidden">
        {selectedMediaUrl ? (
          <video
            ref={videoRef}
            key={selectedMediaUrl} // Kunci untuk me-remount video saat URL berubah
            className="w-full h-full object-contain"
            src={selectedMediaUrl}
            autoPlay
            controls // Tampilkan kontrol video bawaan browser
            loop={isLooping}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <p>Please select a video to play.</p>
          </div>
        )}
      </div>
    </div>
  );
}