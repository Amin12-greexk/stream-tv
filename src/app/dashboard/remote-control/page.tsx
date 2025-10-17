"use client";
import { useEffect, useState } from "react";

type Device = {
  id: string;
  name: string;
  code: string;
  lastSeen: string | null;
  group: { name: string } | null;
};

type CommandHistory = {
  id: string;
  command: string;
  params: any;
  status: string;
  createdAt: string;
  executedAt: string | null;
};

export default function RemoteControlPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [customCommand, setCustomCommand] = useState("");
  const [customParams, setCustomParams] = useState("");

  // Load devices
  async function loadDevices() {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
    } finally {
      setLoading(false);
    }
  }

  // Load command history
  async function loadCommandHistory() {
    if (!selectedDevice) return;
    
    try {
      const res = await fetch(`/api/player/command?device=${selectedDevice}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setCommandHistory(data.commands || []);
      }
    } catch (error) {
      console.error("Failed to load command history:", error);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadCommandHistory();
      const interval = setInterval(loadCommandHistory, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  // Send command
  async function sendCommand(command: string, params?: any) {
    if (!selectedDevice) {
      showMessage("error", "Silakan pilih perangkat terlebih dahulu");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/player/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceCode: selectedDevice,
          command,
          params
        })
      });

      if (res.ok) {
        const data = await res.json();
        showMessage("success", data.message || "Perintah berhasil dikirim");
        loadCommandHistory();
      } else {
        const error = await res.json();
        showMessage("error", error.error || "Gagal mengirim perintah");
      }
    } catch (error) {
      console.error("Send command error:", error);
      showMessage("error", "Gagal mengirim perintah");
    } finally {
      setSending(false);
    }
  }

  function showMessage(type: string, text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function isDeviceOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false;
    // Device is online if last seen within the last 60 seconds
    return Date.now() - new Date(lastSeen).getTime() < 60000;
  }

  function getPlayerUrl(deviceCode: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/player?device=${deviceCode}`;
  }

  const selectedDeviceData = devices.find(d => d.code === selectedDevice);
  const onlineDevices = devices.filter(d => isDeviceOnline(d.lastSeen));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-4 text-gray-600 font-medium">Memuat remote control...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 sm:p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎮</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Kontrol Remote</h1>
              <p className="text-purple-100 text-sm sm:text-base max-w-2xl mx-auto">
                Kontrol perangkat player secara remote dari dashboard TV TEI
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 text-center">
                <div className="text-2xl font-bold text-blue-900">{devices.length}</div>
                <div className="text-xs text-blue-600">Total Perangkat</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 text-center">
                <div className="text-2xl font-bold text-green-900">{onlineDevices.length}</div>
                <div className="text-xs text-green-600">Online</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 text-center">
                <div className="text-2xl font-bold text-purple-900">{selectedDevice ? 1 : 0}</div>
                <div className="text-xs text-purple-600">Dipilih</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200 text-center">
                <div className="text-2xl font-bold text-orange-900">{commandHistory.length}</div>
                <div className="text-xs text-orange-600">Riwayat Perintah</div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`p-4 rounded-xl font-medium ${
            message.type === "success" 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* Device Selection */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📱</span>
              Pilih Perangkat
            </h3>
            <p className="text-indigo-100 text-sm mt-1">Pilih perangkat yang ingin dikontrol</p>
          </div>
          
          <div className="p-6">
            {devices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📱</div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Belum ada perangkat</h4>
                <p className="text-gray-600">Daftarkan perangkat terlebih dahulu untuk menggunakan kontrol remote.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => {
                  const online = isDeviceOnline(device.lastSeen);
                  const isSelected = selectedDevice === device.code;
                  
                  return (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDevice(device.code)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-purple-500 bg-purple-50 shadow-lg transform scale-105"
                          : "border-gray-200 hover:border-purple-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-4 h-4 rounded-full ${
                          online ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        }`} />
                        <span className="font-bold text-gray-900">{device.name}</span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Kode: <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono">{device.code}</code></div>
                        {device.group && <div>Grup: {device.group.name}</div>}
                        <div className={`font-medium ${online ? "text-green-600" : "text-gray-500"}`}>
                          {online ? "🟢 Online" : "🔴 Offline"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        {selectedDevice && (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>🎛️</span>
                      Panel Kontrol
                    </h3>
                    <p className="text-teal-100 text-sm mt-1">Kontrol pemutaran perangkat yang dipilih</p>
                  </div>
                  {selectedDeviceData && (
                    <div className="flex items-center gap-3 text-white">
                      <div className="text-right">
                        <div className="text-sm opacity-90">Mengontrol:</div>
                        <div className="font-bold">{selectedDeviceData.name}</div>
                      </div>
                      <a
                        href={getPlayerUrl(selectedDevice)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      >
                        🚀 Buka Player
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Playback Controls */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>▶️</span>
                    Kontrol Pemutaran
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <button
                      onClick={() => sendCommand("play")}
                      disabled={sending}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-3xl">▶️</span>
                      <span className="text-sm font-bold">Putar</span>
                    </button>

                    <button
                      onClick={() => sendCommand("pause")}
                      disabled={sending}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-3xl">⏸️</span>
                      <span className="text-sm font-bold">Jeda</span>
                    </button>

                    <button
                      onClick={() => sendCommand("stop")}
                      disabled={sending}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-3xl">⏹️</span>
                      <span className="text-sm font-bold">Berhenti</span>
                    </button>

                    <button
                      onClick={() => sendCommand("previous")}
                      disabled={sending}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-3xl">⏮️</span>
                      <span className="text-sm font-bold">Sebelumnya</span>
                    </button>

                    <button
                      onClick={() => sendCommand("next")}
                      disabled={sending}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-3xl">⏭️</span>
                      <span className="text-sm font-bold">Selanjutnya</span>
                    </button>
                  </div>
                </div>

                {/* Volume Controls */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🔊</span>
                    Kontrol Volume
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <button
                      onClick={() => sendCommand("mute")}
                      disabled={sending}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-2xl">🔇</span>
                      <span className="text-xs font-bold">Bisukan</span>
                    </button>

                    <button
                      onClick={() => sendCommand("volume", { level: 0.25 })}
                      disabled={sending}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-2xl">🔉</span>
                      <span className="text-xs font-bold">25%</span>
                    </button>

                    <button
                      onClick={() => sendCommand("volume", { level: 0.5 })}
                      disabled={sending}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-2xl">🔉</span>
                      <span className="text-xs font-bold">50%</span>
                    </button>

                    <button
                      onClick={() => sendCommand("volume", { level: 0.75 })}
                      disabled={sending}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-2xl">🔊</span>
                      <span className="text-xs font-bold">75%</span>
                    </button>

                    <button
                      onClick={() => sendCommand("volume", { level: 1.0 })}
                      disabled={sending}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-2xl">🔊</span>
                      <span className="text-xs font-bold">100%</span>
                    </button>

                    <button
                      onClick={() => sendCommand("unmute")}
                      disabled={sending}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-2xl">🔊</span>
                      <span className="text-xs font-bold">Suara On</span>
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>⚡</span>
                    Aksi Cepat
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => sendCommand("goto", { index: 0 })}
                      disabled={sending}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-xl">⏮️</span>
                      <span className="text-sm font-bold">Ke Awal</span>
                    </button>

                    <button
                      onClick={() => sendCommand("fullscreen")}
                      disabled={sending}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-xl">⛶</span>
                      <span className="text-sm font-bold">Layar Penuh</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("Refresh halaman player?")) {
                          sendCommand("refresh");
                        }
                      }}
                      disabled={sending}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-xl">🔄</span>
                      <span className="text-sm font-bold">Refresh Player</span>
                    </button>

                    <button
                      onClick={() => sendCommand("status")}
                      disabled={sending}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span className="text-xl">📊</span>
                      <span className="text-sm font-bold">Cek Status</span>
                    </button>
                  </div>
                </div>

                {/* Custom Command */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🛠️</span>
                    Perintah Kustom (Lanjutan)
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Perintah (contoh: play, pause)"
                        value={customCommand}
                        onChange={(e) => setCustomCommand(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder='Parameter JSON (contoh: {"level": 0.5})'
                        value={customParams}
                        onChange={(e) => setCustomParams(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => {
                          try {
                            const params = customParams ? JSON.parse(customParams) : undefined;
                            sendCommand(customCommand, params);
                            setCustomCommand("");
                            setCustomParams("");
                          } catch (error) {
                            showMessage("error", "Parameter JSON tidak valid");
                          }
                        }}
                        disabled={sending || !customCommand}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl transition-all duration-200 font-bold"
                      >
                        Kirim Perintah
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Command History */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>📜</span>
                      Riwayat Perintah
                    </h3>
                    <p className="text-orange-100 text-sm mt-1">Log perintah yang telah dikirim</p>
                  </div>
                  <button
                    onClick={loadCommandHistory}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all font-medium"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-800">Waktu</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-800">Perintah</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-800">Parameter</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-800">Status</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-800">Dieksekusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {commandHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                            <div className="text-4xl mb-2">📜</div>
                            <div className="font-medium">Belum ada perintah yang dikirim</div>
                          </td>
                        </tr>
                      ) : (
                        commandHistory.map((cmd) => (
                          <tr key={cmd.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">
                              {new Date(cmd.createdAt).toLocaleTimeString('id-ID')}
                            </td>
                            <td className="px-4 py-3">
                              <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                {cmd.command}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              {cmd.params ? (
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {JSON.stringify(cmd.params)}
                                </code>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                cmd.status === "executed"
                                  ? "bg-green-100 text-green-800"
                                  : cmd.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {cmd.status === "executed" ? "Berhasil" : cmd.status === "failed" ? "Gagal" : "Menunggu"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {cmd.executedAt
                                ? new Date(cmd.executedAt).toLocaleTimeString('id-ID')
                                : "-"
                              }
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}