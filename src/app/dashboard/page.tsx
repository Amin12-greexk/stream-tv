// src/app/(dashboard)/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = {
  mediaCount: number;
  playlistCount: number;
  deviceCount: number;
  onlineDevices: number;
  groupCount: number;
  assignmentCount: number;
};

export default function DashboardHome() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    mediaCount: 0,
    playlistCount: 0,
    deviceCount: 0,
    onlineDevices: 0,
    groupCount: 0,
    assignmentCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setError(null);
        
        // Fetch with proper error handling
        const fetchWithErrorHandling = async (url: string) => {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
          }
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch {
            console.error(`Invalid JSON from ${url}:`, text.substring(0, 100));
            return [];
          }
        };

        const [media, playlists, devices, groups, assignments] = await Promise.all([
          fetchWithErrorHandling("/api/media"),
          fetchWithErrorHandling("/api/playlist"),
          fetchWithErrorHandling("/api/devices"),
          fetchWithErrorHandling("/api/groups"),
          fetchWithErrorHandling("/api/assignments"),
        ]);

        const onlineCount = devices.filter((d: any) => {
          if (!d.lastSeen) return false;
          const lastSeen = new Date(d.lastSeen);
          return Date.now() - lastSeen.getTime() < 60000;
        }).length;

        setStats({
          mediaCount: media.length,
          playlistCount: playlists.length,
          deviceCount: devices.length,
          onlineDevices: onlineCount,
          groupCount: groups.length,
          assignmentCount: assignments.length,
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
        setError("Failed to load dashboard data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: "Media Files",
      value: stats.mediaCount,
      icon: "🎬",
      color: "bg-green-500",
      link: "/dashboard/media",
    },
    {
      title: "Playlists",
      value: stats.playlistCount,
      icon: "📋",
      color: "bg-green-600",
      link: "/dashboard/playlists",
    },
    {
      title: "Devices",
      value: `${stats.onlineDevices}/${stats.deviceCount}`,
      subtitle: "online",
      icon: "📱",
      color: "bg-green-700",
      link: "/dashboard/devices",
    },
    {
      title: "Device Groups",
      value: stats.groupCount,
      icon: "👥",
      color: "bg-emerald-500",
      link: "/dashboard/groups",
    },
    {
      title: "Active Schedules",
      value: stats.assignmentCount,
      icon: "⏰",
      color: "bg-teal-500",
      link: "/dashboard/schedules",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-gray-600 mt-1">Welcome to your TV Signage control panel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => router.push(card.link)}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left group border-2 border-transparent hover:border-green-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-md`}>
                {card.icon}
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">
                {card.value}
                {card.subtitle && <span className="text-sm text-gray-500 ml-2">{card.subtitle}</span>}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-2 border-green-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🚀</span>
            <span>Quick Start Guide</span>
          </h3>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <strong className="text-gray-900">Upload Media</strong>
                <p className="text-gray-600">Add images and videos to your library</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <strong className="text-gray-900">Create Playlist</strong>
                <p className="text-gray-600">Organize media into playlists</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <strong className="text-gray-900">Register Devices</strong>
                <p className="text-gray-600">Add your TV displays</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <div>
                <strong className="text-gray-900">Create Schedule</strong>
                <p className="text-gray-600">Assign playlists to devices with time slots</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                5
              </span>
              <div>
                <strong className="text-gray-900">Open Player</strong>
                <p className="text-gray-600">Launch player page on your TV displays</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-2 border-green-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📊</span>
            <span>System Status</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Devices Online</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: stats.deviceCount > 0
                        ? `${(stats.onlineDevices / stats.deviceCount) * 100}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {stats.deviceCount > 0
                    ? Math.round((stats.onlineDevices / stats.deviceCount) * 100)
                    : 0}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Media Files</span>
              <span className="font-medium text-gray-900">{stats.mediaCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Schedules</span>
              <span className="font-medium text-gray-900">{stats.assignmentCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Playlists Created</span>
              <span className="font-medium text-gray-900">{stats.playlistCount}</span>
            </div>

            {stats.deviceCount === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                ⚠️ No devices registered yet. Add your first device to get started!
              </div>
            )}

            {stats.mediaCount === 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                💡 Upload some media files to start creating content!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}