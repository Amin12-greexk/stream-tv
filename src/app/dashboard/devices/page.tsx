// src/app/dashboard/devices/page.tsx
"use client";
import { useEffect, useState } from "react";

type Device = {
  id: string;
  name: string;
  code: string;
  groupId: string | null;
  lastSeen: string | null;
  playerVer: string | null;
  createdAt: string;
  group: { id: string; name: string } | null;
};

type DeviceGroup = {
  id: string;
  name: string;
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "online" | "offline">("all");
  
  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [groupId, setGroupId] = useState("");

  async function loadDevices() {
    const res = await fetch("/api/devices", { cache: "no-store" });
    const data = await res.json();
    setDevices(data);
    setLoading(false);
  }

  async function loadGroups() {
    const res = await fetch("/api/groups", { cache: "no-store" });
    const data = await res.json();
    setGroups(data);
  }

  useEffect(() => {
    loadDevices();
    loadGroups();
    
    // Refresh device status every 30 seconds
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, groupId: groupId || null }),
    });

    if (res.ok) {
      setName("");
      setCode("");
      setGroupId("");
      setShowForm(false);
      loadDevices();
    } else {
      const error = await res.json();
      alert(error.error || "Gagal membuat perangkat");
    }
  }

  async function onUpdateGroup(deviceId: string, newGroupId: string | null) {
    const res = await fetch("/api/devices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deviceId, groupId: newGroupId }),
    });

    if (res.ok) {
      loadDevices();
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus perangkat ini? Tindakan ini tidak dapat dibatalkan.")) return;
    
    const res = await fetch(`/api/devices?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      loadDevices();
    }
  }

  function isOnline(lastSeen: string | null) {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = Date.now();
    return now - lastSeenTime < 60000; // Online if seen in last 60 seconds
  }

  function getPlayerUrl(code: string) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/player?device=${code}`;
  }

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "online") {
      return matchesSearch && isOnline(device.lastSeen);
    } else if (filterStatus === "offline") {
      return matchesSearch && !isOnline(device.lastSeen);
    }
    return matchesSearch;
  });

  const stats = {
    total: devices.length,
    online: devices.filter(d => isOnline(d.lastSeen)).length,
    offline: devices.filter(d => !isOnline(d.lastSeen)).length,
    grouped: devices.filter(d => d.groupId).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📱</span>
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Manajemen Perangkat</h1>
                <p className="text-indigo-100 text-sm sm:text-base">Kelola dan pantau perangkat display TV TEI</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium border border-white/20"
              >
                <span className="text-xl">{showForm ? "❌" : "➕"}</span>
                <span>{showForm ? "Batal" : "Tambah Perangkat"}</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-medium text-blue-700">TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600">Perangkat</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🟢</span>
                  <span className="text-xs font-medium text-green-700">ONLINE</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.online}</p>
                <p className="text-xs text-green-600">Aktif</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔴</span>
                  <span className="text-xs font-medium text-red-700">OFFLINE</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{stats.offline}</p>
                <p className="text-xs text-red-600">Tidak aktif</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👥</span>
                  <span className="text-xs font-medium text-purple-700">GRUP</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.grouped}</p>
                <p className="text-xs text-purple-600">Dikelompokkan</p>
              </div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari perangkat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Semua", icon: "📱" },
                  { key: "online", label: "Online", icon: "🟢" },
                  { key: "offline", label: "Offline", icon: "🔴" }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setFilterStatus(filter.key as any)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      filterStatus === filter.key
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span className="hidden sm:inline">{filter.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={loadDevices}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-medium"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <span className="text-2xl">➕</span>
                <div>
                  <h3 className="text-xl font-bold">Daftarkan Perangkat Baru</h3>
                  <p className="text-emerald-100 text-sm">Tambahkan perangkat display ke sistem TV TEI</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={onSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    📺 Nama Perangkat *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    placeholder="contoh: TV Lobby, Display Ruang Rapat"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    🏷️ Kode Perangkat *
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg"
                      placeholder="contoh: ABC12345"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                    />
                    <button
                      type="button"
                      onClick={generateCode}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all font-bold"
                    >
                      🎲 Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Kode unik untuk mengidentifikasi perangkat ini
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  👥 Grup Perangkat (Opsional)
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">Tanpa grup</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl transition-all duration-200 font-bold text-lg shadow-lg"
                >
                  <span>✅</span>
                  Daftarkan Perangkat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setName("");
                    setCode("");
                    setGroupId("");
                  }}
                  className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-bold text-lg"
                >
                  ❌ Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-4 text-gray-600 font-medium">Memuat perangkat...</span>
            </div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">
              {searchTerm || filterStatus !== "all" ? "🔍" : "📱"}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm || filterStatus !== "all" ? "Tidak ada hasil" : "Belum ada perangkat"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== "all" 
                ? "Coba ubah pencarian atau filter Anda" 
                : "Daftarkan perangkat pertama Anda untuk memulai"
              }
            </p>
            {!searchTerm && filterStatus === "all" && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl transition-all duration-200 font-bold shadow-lg"
              >
                ➕ Tambah Perangkat Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredDevices.map((device) => {
              const online = isOnline(device.lastSeen);
              const playerUrl = getPlayerUrl(device.code);
              
              return (
                <div key={device.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row items-start gap-6">
                      
                      {/* Device Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                              online 
                                ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-lg' 
                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              📺
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{device.name}</h3>
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                                online 
                                  ? "bg-green-100 text-green-700 border border-green-200" 
                                  : "bg-gray-100 text-gray-600 border border-gray-200"
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                  online ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                }`} />
                                {online ? "🟢 Online" : "🔴 Offline"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Device Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">🏷️</span>
                              <span className="text-sm font-medium text-gray-600">Kode</span>
                            </div>
                            <p className="font-mono font-bold text-lg text-gray-900">{device.code}</p>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">👥</span>
                              <span className="text-sm font-medium text-gray-600">Grup</span>
                            </div>
                            <select
                              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                              value={device.groupId || ""}
                              onChange={(e) => onUpdateGroup(device.id, e.target.value || null)}
                            >
                              <option value="">Tanpa grup</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {device.lastSeen && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">⏰</span>
                                <span className="text-sm font-medium text-gray-600">Terakhir aktif</span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(device.lastSeen).toLocaleString('id-ID')}
                              </p>
                            </div>
                          )}

                          {device.playerVer && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🔢</span>
                                <span className="text-sm font-medium text-gray-600">Versi Player</span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{device.playerVer}</p>
                            </div>
                          )}
                        </div>

                        {/* Player URL */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">🔗</span>
                            <span className="text-sm font-bold text-blue-800">URL Player</span>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <code className="flex-1 bg-white px-3 py-2 rounded-lg text-xs font-mono border border-blue-200 break-all">
                              {playerUrl}
                            </code>
                            <a
                              href={playerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-medium text-sm whitespace-nowrap"
                            >
                              <span>🚀</span>
                              Buka Player
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-3">
                        <button
                          onClick={() => navigator.clipboard?.writeText(playerUrl)}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-all font-medium text-sm"
                        >
                          <span>📋</span>
                          <span className="hidden sm:inline">Salin URL</span>
                        </button>
                        <button
                          onClick={() => onDelete(device.id)}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-4 py-3 rounded-xl transition-all font-medium text-sm border border-red-200"
                        >
                          <span>🗑️</span>
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">💡</span>
              <h4 className="font-bold text-lg">Tips Manajemen Perangkat</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p><strong>Penamaan yang jelas:</strong> Gunakan nama lokasi atau fungsi perangkat</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🏷️</span>
                  <div>
                    <p><strong>Kode unik:</strong> Pastikan setiap perangkat memiliki kode yang mudah diingat</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">👥</span>
                  <div>
                    <p><strong>Gunakan grup:</strong> Kelompokkan perangkat berdasarkan lokasi atau fungsi</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">📡</span>
                  <div>
                    <p><strong>Pantau status:</strong> Periksa status online secara berkala untuk memastikan konektivitas</p>
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