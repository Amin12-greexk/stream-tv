// src/app/dashboard/groups/page.tsx
"use client";
import { useEffect, useState } from "react";

type Device = {
  id: string;
  name: string;
  code: string;
  lastSeen: string | null;
};

type Assignment = {
  id: string;
  playlist: { name: string };
  startTime: string;
  endTime: string;
  days: { dayOfWeek: number }[];
};

type DeviceGroup = {
  id: string;
  name: string;
  devices: Device[];
  assignments: Assignment[];
  createdAt: string;
};

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function GroupsPage() {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadGroups() {
    try {
      const res = await fetch("/api/groups", { cache: "no-store" });
      const data = await res.json();
      setGroups(data);
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });

    if (res.ok) {
      setGroupName("");
      setShowForm(false);
      loadGroups();
    } else {
      const error = await res.json();
      alert(error.error || "Gagal membuat grup");
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm("Hapus grup ini? Perangkat akan dilepas dari grup tetapi tidak dihapus.")) return;
    
    const res = await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      loadGroups();
      if (selectedGroup === id) {
        setSelectedGroup(null);
      }
    }
  }

  function isOnline(lastSeen: string | null) {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 60000;
  }

  function formatTime(time: string) {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Filter groups
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  const stats = {
    totalGroups: groups.length,
    totalDevices: groups.reduce((sum, g) => sum + g.devices.length, 0),
    totalSchedules: groups.reduce((sum, g) => sum + g.assignments.length, 0),
    onlineDevices: groups.reduce((sum, g) => sum + g.devices.filter(d => isOnline(d.lastSeen)).length, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-3xl">👥</span>
              </div>
              <div className="flex-1 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Grup Perangkat</h1>
                <p className="text-emerald-100 text-sm sm:text-base">Organisir perangkat dalam grup untuk manajemen yang lebih mudah</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium border border-white/20"
              >
                <span className="text-xl">{showForm ? "❌" : "➕"}</span>
                <span>{showForm ? "Batal" : "Buat Grup"}</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-medium text-blue-700">GRUP</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{stats.totalGroups}</p>
                <p className="text-xs text-blue-600">Total grup</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📱</span>
                  <span className="text-xs font-medium text-green-700">PERANGKAT</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{stats.totalDevices}</p>
                <p className="text-xs text-green-600">Total perangkat</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⏰</span>
                  <span className="text-xs font-medium text-purple-700">JADWAL</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{stats.totalSchedules}</p>
                <p className="text-xs text-purple-600">Total jadwal</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🟢</span>
                  <span className="text-xs font-medium text-orange-700">ONLINE</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{stats.onlineDevices}</p>
                <p className="text-xs text-orange-600">Perangkat aktif</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari grup..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6">
              <div className="flex items-center gap-3 text-white">
                <span className="text-2xl">➕</span>
                <div>
                  <h3 className="text-xl font-bold">Buat Grup Baru</h3>
                  <p className="text-teal-100 text-sm">Buat grup untuk mengorganisir perangkat</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={createGroup} className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                  placeholder="Nama grup (contoh: TV Lobby, Ruang Meeting)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold"
                  >
                    <span>✅</span>
                    Buat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-bold"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-4 text-gray-600 font-medium">Memuat grup...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Groups List */}
            <div className="xl:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>📁</span>
                    Daftar Grup ({filteredGroups.length})
                  </h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {filteredGroups.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="font-medium mb-1">
                        {searchTerm ? "Tidak ada hasil" : "Belum ada grup"}
                      </p>
                      <p className="text-sm">
                        {searchTerm ? "Coba kata kunci lain" : "Buat grup pertama Anda"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {filteredGroups.map((group) => {
                        const onlineCount = group.devices.filter(d => isOnline(d.lastSeen)).length;
                        
                        return (
                          <div
                            key={group.id}
                            className={`rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                              selectedGroup === group.id
                                ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500 shadow-lg transform scale-105"
                                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
                            }`}
                            onClick={() => setSelectedGroup(group.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">👥</span>
                                  <h4 className="font-bold text-gray-900 truncate">{group.name}</h4>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                      <span>📱</span>
                                      {group.devices.length} perangkat
                                    </span>
                                    {group.devices.length > 0 && (
                                      <span className="text-green-600 font-medium">
                                        ({onlineCount} online)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>⏰</span>
                                    {group.assignments.length} jadwal
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGroup(group.id);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Group Details */}
            <div className="xl:col-span-2 space-y-6">
              {selectedGroupData ? (
                <>
                  {/* Group Info */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">👥</span>
                        <div className="text-white">
                          <h3 className="text-xl font-bold">{selectedGroupData.name}</h3>
                          <p className="text-purple-100 text-sm">Detail informasi grup</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{selectedGroupData.devices.length}</div>
                          <div className="text-sm text-gray-600">Total Perangkat</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedGroupData.devices.filter(d => isOnline(d.lastSeen)).length}
                          </div>
                          <div className="text-sm text-gray-600">Online</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{selectedGroupData.assignments.length}</div>
                          <div className="text-sm text-gray-600">Jadwal Aktif</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-700">
                            {new Date(selectedGroupData.createdAt).toLocaleDateString('id-ID')}
                          </div>
                          <div className="text-sm text-gray-600">Dibuat</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Devices in Group */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4">
                      <h4 className="font-bold text-lg text-white flex items-center gap-2">
                        <span>📱</span>
                        Perangkat dalam Grup
                      </h4>
                    </div>
                    
                    <div className="p-6">
                      {selectedGroupData.devices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-6xl mb-4">📱</div>
                          <h5 className="font-bold text-gray-800 mb-2">Belum ada perangkat</h5>
                          <p className="text-gray-600 mb-2">Grup ini belum memiliki perangkat yang ditugaskan.</p>
                          <p className="text-sm text-gray-500">Pergi ke halaman Perangkat untuk menugaskan perangkat ke grup ini.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedGroupData.devices.map((device) => {
                            const online = isOnline(device.lastSeen);
                            return (
                              <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                                    online 
                                      ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' 
                                      : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                                  }`}>
                                    📺
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900">{device.name}</div>
                                    <div className="text-sm text-gray-600">Kode: {device.code}</div>
                                  </div>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold ${
                                  online ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600 border border-gray-200"
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${
                                    online ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                  }`} />
                                  {online ? "Online" : "Offline"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Schedules */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4">
                      <h4 className="font-bold text-lg text-white flex items-center gap-2">
                        <span>⏰</span>
                        Jadwal Aktif
                      </h4>
                    </div>
                    
                    <div className="p-6">
                      {selectedGroupData.assignments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-6xl mb-4">⏰</div>
                          <h5 className="font-bold text-gray-800 mb-2">Belum ada jadwal</h5>
                          <p className="text-gray-600 mb-2">Grup ini belum memiliki jadwal yang aktif.</p>
                          <p className="text-sm text-gray-500">Pergi ke halaman Jadwal untuk membuat jadwal untuk grup ini.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedGroupData.assignments.map((assignment) => {
                            const daysList = assignment.days
                              .map(d => DAYS[d.dayOfWeek])
                              .join(", ");
                            
                            return (
                              <div key={assignment.id} className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-lg">📋</span>
                                      <div className="font-bold text-gray-900">{assignment.playlist.name}</div>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <span>🕐</span>
                                        <span>{formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span>📅</span>
                                        <span>{daysList}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Pilih Grup</h3>
                  <p className="text-gray-600">Pilih grup dari daftar di sebelah kiri untuk melihat detail dan informasinya</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">💡</span>
              <h4 className="font-bold text-lg">Tips Manajemen Grup</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🏢</span>
                  <div>
                    <p><strong>Organisasi berdasarkan lokasi:</strong> Kelompokkan perangkat berdasarkan lantai, gedung, atau area</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p><strong>Fungsi yang sama:</strong> Grup perangkat dengan tujuan atau konten yang serupa</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📋</span>
                  <div>
                    <p><strong>Jadwal grup:</strong> Buat jadwal untuk seluruh grup sekaligus untuk efisiensi</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔄</span>
                  <div>
                    <p><strong>Fleksibilitas:</strong> Perangkat dapat dipindah antar grup kapan saja sesuai kebutuhan</p>
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