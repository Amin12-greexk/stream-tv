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
        setError("Gagal memuat data dashboard. Silakan refresh halaman.");
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
      title: "File Media",
      value: stats.mediaCount,
      icon: "🎬",
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      link: "/dashboard/media",
      description: "Total konten media"
    },
    {
      title: "Playlist",
      value: stats.playlistCount,
      icon: "📋",
      gradient: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      link: "/dashboard/playlists",
      description: "Daftar konten terorganisir"
    },
    {
      title: "Perangkat",
      value: `${stats.onlineDevices}/${stats.deviceCount}`,
      subtitle: "online",
      icon: "📱",
      gradient: "from-green-500 to-green-600",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      link: "/dashboard/devices",
      description: "Status koneksi perangkat"
    },
    {
      title: "Grup Perangkat",
      value: stats.groupCount,
      icon: "👥",
      gradient: "from-indigo-500 to-indigo-600",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      link: "/dashboard/groups",
      description: "Pengelompokan perangkat"
    },
    {
      title: "Jadwal Aktif",
      value: stats.assignmentCount,
      icon: "⏰",
      gradient: "from-orange-500 to-orange-600",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      link: "/dashboard/schedules",
      description: "Penjadwalan konten"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <div className="w-8 h-8 bg-white/20 rounded"></div>
              </div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-teal-600 hover:to-blue-700 transition-all transform hover:scale-105 font-medium shadow-lg"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }

  const onlinePercentage = stats.deviceCount > 0 
    ? Math.round((stats.onlineDevices / stats.deviceCount) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📺</span>
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">TV TEI Dashboard</h1>
                <p className="text-teal-100 text-sm sm:text-base">Kelola konten digital signage dengan mudah</p>
              </div>
              <div className="text-right text-white/90 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Status</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={() => router.push(card.link)}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-left group border border-gray-100 hover:border-gray-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.iconBg} w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{card.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {card.value}
                  {card.subtitle && <span className="text-sm text-gray-500 ml-2">{card.subtitle}</span>}
                </p>
                <p className="text-xs text-gray-400">{card.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Quick Start Guide */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                Panduan Cepat
              </h3>
              <p className="text-emerald-100 text-sm mt-1">Mulai menggunakan TV TEI dalam 5 langkah mudah</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { step: 1, title: "Upload Media", desc: "Tambahkan gambar dan video ke perpustakaan", icon: "📁" },
                  { step: 2, title: "Buat Playlist", desc: "Organisir media menjadi playlist", icon: "📝" },
                  { step: 3, title: "Daftarkan Perangkat", desc: "Tambahkan display TV Anda", icon: "📱" },
                  { step: 4, title: "Buat Jadwal", desc: "Atur playlist ke perangkat dengan waktu", icon: "⏰" },
                  { step: 5, title: "Buka Player", desc: "Jalankan halaman player di TV display", icon: "▶️" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4 group">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg">
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{item.icon}</span>
                        <h4 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">📊</span>
                Status Sistem
              </h3>
              <p className="text-blue-100 text-sm mt-1">Ringkasan kondisi sistem secara real-time</p>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Device Status dengan Progress Bar Enhanced */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Perangkat Online</span>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.onlineDevices} dari {stats.deviceCount}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        onlinePercentage >= 80 
                          ? 'bg-gradient-to-r from-green-400 to-green-500' 
                          : onlinePercentage >= 50 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' 
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ width: `${onlinePercentage}%` }}
                    ></div>
                  </div>
                  <span className={`absolute right-0 -top-6 text-xs font-bold px-2 py-1 rounded-full text-white ${
                    onlinePercentage >= 80 ? 'bg-green-500' : onlinePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {onlinePercentage}%
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎬</span>
                    <span className="text-xs font-medium text-blue-700">MEDIA</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{stats.mediaCount}</p>
                  <p className="text-xs text-blue-600">File tersedia</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📋</span>
                    <span className="text-xs font-medium text-purple-700">PLAYLIST</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{stats.playlistCount}</p>
                  <p className="text-xs text-purple-600">Dibuat</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⏰</span>
                    <span className="text-xs font-medium text-orange-700">JADWAL</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{stats.assignmentCount}</p>
                  <p className="text-xs text-orange-600">Aktif</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👥</span>
                    <span className="text-xs font-medium text-indigo-700">GRUP</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">{stats.groupCount}</p>
                  <p className="text-xs text-indigo-600">Perangkat</p>
                </div>
              </div>

              {/* Alerts */}
              {stats.deviceCount === 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div>
                      <p className="font-medium text-yellow-800 text-sm">Belum ada perangkat terdaftar</p>
                      <p className="text-xs text-yellow-700 mt-1">Tambahkan perangkat pertama Anda untuk memulai!</p>
                    </div>
                  </div>
                </div>
              )}

              {stats.mediaCount === 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                    <div>
                      <p className="font-medium text-green-800 text-sm">Siap untuk memulai?</p>
                      <p className="text-xs text-green-700 mt-1">Upload beberapa file media untuk mulai membuat konten!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}