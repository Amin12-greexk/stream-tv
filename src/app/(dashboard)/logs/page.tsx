// ===== src/app/(dashboard)/logs/page.tsx =====
"use client";
import { useEffect, useState } from "react";

type PlayLog = {
  id: string;
  deviceId: string;
  mediaId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  notes: string | null;
  device: { name: string; code: string };
  media: { title: string; type: string };
};

export default function LogsPage() {
  const [logs, setLogs] = useState<PlayLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    const res = await fetch("/api/logs", { cache: "no-store" });
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Playback Logs</h2>
        <button
          onClick={loadLogs}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Loading logs...
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Media
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    {new Date(log.startedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{log.device.name}</div>
                    <div className="text-xs text-gray-500">{log.device.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{log.media.title}</div>
                    <div className="text-xs text-gray-500">{log.media.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        log.status === "playing"
                          ? "bg-green-100 text-green-800"
                          : log.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No logs yet. Logs will appear when devices start playing content.
            </div>
          )}
        </div>
      )}
    </div>
  );
}