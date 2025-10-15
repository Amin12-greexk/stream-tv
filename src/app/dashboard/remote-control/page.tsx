
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
      showMessage("error", "Please select a device first");
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
        showMessage("success", data.message || "Command sent successfully");
        loadCommandHistory();
      } else {
        const error = await res.json();
        showMessage("error", error.error || "Failed to send command");
      }
    } catch (error) {
      console.error("Send command error:", error);
      showMessage("error", "Failed to send command");
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
    return Date.now() - new Date(lastSeen).getTime() < 60000;
  }

  function getPlayerUrl(deviceCode: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/player?device=${deviceCode}`;
  }

  const selectedDeviceData = devices.find(d => d.code === selectedDevice);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading remote control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🎮</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Remote Control</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Control player devices remotely from the dashboard
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`${
          message.type === "success" ? "alert-success" : "alert-error"
        } animate-slide-down`}>
          {message.text}
        </div>
      )}

      {/* Device Selection */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📱</span>
          Select Device
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const online = isDeviceOnline(device.lastSeen);
            const isSelected = selectedDevice === device.code;
            
            return (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(device.code)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-purple-500 bg-purple-50 shadow-lg"
                    : "border-gray-200 hover:border-purple-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    online ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`} />
                  <span className="font-semibold">{device.name}</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div>Code: <code className="bg-gray-200 px-1 rounded">{device.code}</code></div>
                  {device.group && <div>Group: {device.group.name}</div>}
                  <div className={online ? "text-green-600 font-medium" : "text-gray-500"}>
                    {online ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {devices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No devices registered. Register devices first to use remote control.
          </div>
        )}
      </div>

      {/* Control Panel */}
      {selectedDevice && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🎛️</span>
                Control Panel
              </h3>
              {selectedDeviceData && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    Controlling: <strong>{selectedDeviceData.name}</strong>
                  </span>
                  <a
                    href={getPlayerUrl(selectedDevice)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Open Player →
                  </a>
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Playback Controls</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => sendCommand("play")}
                  disabled={sending}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">▶️</span>
                  <span className="text-sm font-medium">Play</span>
                </button>

                <button
                  onClick={() => sendCommand("pause")}
                  disabled={sending}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⏸️</span>
                  <span className="text-sm font-medium">Pause</span>
                </button>

                <button
                  onClick={() => sendCommand("stop")}
                  disabled={sending}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⏹️</span>
                  <span className="text-sm font-medium">Stop</span>
                </button>

                <button
                  onClick={() => sendCommand("previous")}
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⏮️</span>
                  <span className="text-sm font-medium">Previous</span>
                </button>

                <button
                  onClick={() => sendCommand("next")}
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⏭️</span>
                  <span className="text-sm font-medium">Next</span>
                </button>
              </div>
            </div>

            {/* Volume Controls */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Volume Controls</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <button
                  onClick={() => sendCommand("mute")}
                  disabled={sending}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🔇</span>
                  <span className="text-sm font-medium">Mute</span>
                </button>

                <button
                  onClick={() => sendCommand("volume", { level: 0.25 })}
                  disabled={sending}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🔉</span>
                  <span className="text-sm font-medium">25%</span>
                </button>

                <button
                  onClick={() => sendCommand("volume", { level: 0.5 })}
                  disabled={sending}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🔉</span>
                  <span className="text-sm font-medium">50%</span>
                </button>

                <button
                  onClick={() => sendCommand("volume", { level: 0.75 })}
                  disabled={sending}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🔊</span>
                  <span className="text-sm font-medium">75%</span>
                </button>

                <button
                  onClick={() => sendCommand("volume", { level: 1.0 })}
                  disabled={sending}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🔊</span>
                  <span className="text-sm font-medium">100%</span>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => sendCommand("goto", { index: 0 })}
                  disabled={sending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">⏮️</span>
                  <span className="text-sm font-medium">Go to First</span>
                </button>

                <button
                  onClick={() => sendCommand("unmute")}
                  disabled={sending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🔊</span>
                  <span className="text-sm font-medium">Unmute</span>
                </button>

                <button
                  onClick={() => sendCommand("fullscreen")}
                  disabled={sending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">⛶</span>
                  <span className="text-sm font-medium">Toggle Fullscreen</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm("Refresh player page?")) {
                      sendCommand("refresh");
                    }
                  }}
                  disabled={sending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white p-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🔄</span>
                  <span className="text-sm font-medium">Refresh Player</span>
                </button>
              </div>
            </div>

            {/* Custom Command */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Custom Command (Advanced)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Command (e.g., play, pause)"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder='Params JSON (e.g., {"level": 0.5})'
                  value={customParams}
                  onChange={(e) => setCustomParams(e.target.value)}
                  className="form-input"
                />
                <button
                  onClick={() => {
                    try {
                      const params = customParams ? JSON.parse(customParams) : undefined;
                      sendCommand(customCommand, params);
                      setCustomCommand("");
                      setCustomParams("");
                    } catch (error) {
                      showMessage("error", "Invalid JSON params");
                    }
                  }}
                  disabled={sending || !customCommand}
                  className="btn-primary disabled:opacity-50"
                >
                  Send Custom Command
                </button>
              </div>
            </div>
          </div>

          {/* Command History */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>📜</span>
                Command History
              </h3>
              <button
                onClick={loadCommandHistory}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Command</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Params</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {commandHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No commands sent yet
                      </td>
                    </tr>
                  ) : (
                    commandHistory.map((cmd) => (
                      <tr key={cmd.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {new Date(cmd.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {cmd.command}
                          </code>
                        </td>
                        <td className="px-4 py-2">
                          {cmd.params ? (
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {JSON.stringify(cmd.params)}
                            </code>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            cmd.status === "executed"
                              ? "bg-green-100 text-green-800"
                              : cmd.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {cmd.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {cmd.executedAt
                            ? new Date(cmd.executedAt).toLocaleTimeString()
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
        </>
      )}

      {/* Help Section */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>💡</span>
          How Remote Control Works
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• <strong>Select a device</strong> from the list above to start controlling it</p>
          <p>• <strong>Commands are sent</strong> to the server and queued for the device</p>
          <p>• <strong>Player polls</strong> for new commands every 2 seconds</p>
          <p>• <strong>Check command history</strong> to see if commands were executed</p>
          <p>• <strong>Device must be online</strong> and have remote control enabled</p>
        </div>
      </div>
    </div>
  );
}