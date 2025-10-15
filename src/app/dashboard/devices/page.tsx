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
  
  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [groupId, setGroupId] = useState("");

  // Edit state
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

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
      alert(error.error || "Failed to create device");
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
    if (!confirm("Delete this device? This action cannot be undone.")) return;
    
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Devices</h2>
          <p className="text-gray-600 mt-1">Manage your display devices</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          {showForm ? "Cancel" : "+ Add Device"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 space-y-4">
          <h3 className="font-semibold text-lg mb-4">Register New Device</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Name *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              placeholder="e.g., Lobby TV, Meeting Room Display"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Code *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-mono"
                placeholder="e.g., ABC12345"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
              <button
                type="button"
                onClick={generateCode}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unique code to identify this device
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Group (Optional)
            </label>
            <select
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Register Device
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setCode("");
                setGroupId("");
              }}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-500">Loading devices...</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => {
            const online = isOnline(device.lastSeen);
            const playerUrl = getPlayerUrl(device.code);
            
            return (
              <div key={device.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{device.name}</h3>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        online 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          online ? "bg-green-500" : "bg-gray-400"
                        }`} />
                        {online ? "Online" : "Offline"}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Code:</span>
                        <span className="ml-2 font-mono font-medium">{device.code}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Group:</span>
                        <select
                          className="ml-1 text-sm border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                          value={device.groupId || ""}
                          onChange={(e) => onUpdateGroup(device.id, e.target.value || null)}
                        >
                          <option value="">No group</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {device.lastSeen && (
                        <div>
                          <span className="text-gray-500">Last seen:</span>
                          <span className="ml-2">{new Date(device.lastSeen).toLocaleString()}</span>
                        </div>
                      )}

                      {device.playerVer && (
                        <div>
                          <span className="text-gray-500">Player version:</span>
                          <span className="ml-2">{device.playerVer}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Player URL:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {playerUrl}
                        </code>
                      </div>
                      
                      <a
                        href={playerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:text-green-700 underline"
                      >
                        Open Player →
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => onDelete(device.id)}
                    className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-500 mb-4">
            No devices registered yet. Add your first device to get started.
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Add First Device
          </button>
        </div>
      )}
    </div>
  );
}