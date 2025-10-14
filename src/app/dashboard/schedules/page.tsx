// ===== src/app/(dashboard)/schedules/page.tsx =====
"use client";
import { useEffect, useState } from "react";

type Assignment = {
  id: string;
  groupId: string;
  playlistId: string;
  startTime: string;
  endTime: string;
  priority: number;
  group: { id: string; name: string };
  playlist: { id: string; name: string };
  days: { dayOfWeek: number }[];
};

type Group = {
  id: string;
  name: string;
};

type Playlist = {
  id: string;
  name: string;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [groupId, setGroupId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [priority, setPriority] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  async function loadAssignments() {
    const res = await fetch("/api/assignments", { cache: "no-store" });
    const data = await res.json();
    setAssignments(data);
  }

  async function loadGroups() {
    const res = await fetch("/api/groups", { cache: "no-store" });
    const data = await res.json();
    setGroups(data);
  }

  async function loadPlaylists() {
    const res = await fetch("/api/playlist", { cache: "no-store" });
    const data = await res.json();
    setPlaylists(data);
  }

  useEffect(() => {
    loadAssignments();
    loadGroups();
    loadPlaylists();
  }, []);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !playlistId || selectedDays.length === 0) {
      return alert("Please fill all required fields");
    }

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        playlistId,
        startTime,
        endTime,
        priority,
        daysOfWeek: selectedDays,
      }),
    });

    if (res.ok) {
      setGroupId("");
      setPlaylistId("");
      setStartTime("00:00");
      setEndTime("23:59");
      setPriority(1);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setShowForm(false);
      loadAssignments();
    } else {
      alert("Failed to create assignment");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this schedule?")) return;
    const res = await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
    if (res.ok) loadAssignments();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Schedules</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Create Schedule"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Device Group *</label>
            <select
              className="border p-2 w-full rounded"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
            >
              <option value="">Select group...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Playlist *</label>
            <select
              className="border p-2 w-full rounded"
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              required
            >
              <option value="">Select playlist...</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                className="border p-2 w-full rounded"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                className="border p-2 w-full rounded"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority (higher = more important)</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Days of Week *</label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`p-2 rounded text-sm font-medium transition-colors ${
                    selectedDays.includes(idx)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Create Schedule
          </button>
        </form>
      )}

      <div className="space-y-3">
        {assignments
          .sort((a, b) => b.priority - a.priority)
          .map((a) => {
            const dayNames = a.days
              .map((d) => DAYS[d.dayOfWeek])
              .sort((x, y) => DAYS.indexOf(x) - DAYS.indexOf(y));

            return (
              <div key={a.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{a.playlist.name}</h3>
                    <p className="text-sm text-gray-600">Group: {a.group.name}</p>
                  </div>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <span className="ml-2 font-medium">
                      {a.startTime} - {a.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <span className="ml-2 font-medium">{a.priority}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-gray-500 text-sm">Days:</span>
                  <div className="flex gap-1 mt-1">
                    {dayNames.map((day) => (
                      <span
                        key={day}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {assignments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No schedules yet. Create a schedule to assign playlists to device groups.
        </div>
      )}
    </div>
  );
}