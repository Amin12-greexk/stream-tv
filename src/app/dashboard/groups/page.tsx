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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function GroupsPage() {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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
      alert(error.error || "Failed to create group");
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? Devices will be unassigned but not deleted.")) return;
    
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

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Groups</h2>
          <p className="text-gray-600 mt-1">Organize devices into groups for schedule management</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          {showForm ? "Cancel" : "+ Create Group"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createGroup} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h3 className="font-semibold text-lg mb-4">Create New Group</h3>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              placeholder="Group name (e.g., Lobby TVs, Meeting Rooms)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-500">Loading groups...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-gray-700">Groups</h3>
            {groups.map((group) => {
              const onlineCount = group.devices.filter(d => isOnline(d.lastSeen)).length;
              
              return (
                <div
                  key={group.id}
                  className={`bg-white p-4 rounded-lg shadow-md border-2 cursor-pointer transition ${
                    selectedGroup === group.id
                      ? "border-green-500 shadow-lg"
                      : "border-gray-100 hover:border-green-200"
                  }`}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{group.name}</h4>
                      <div className="text-sm text-gray-500 mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span>📱 {group.devices.length} devices</span>
                          {group.devices.length > 0 && (
                            <span className="text-green-600">({onlineCount} online)</span>
                          )}
                        </div>
                        <div>⏰ {group.assignments.length} schedules</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            
            {groups.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No groups yet. Create your first group above.
              </div>
            )}
          </div>

          {/* Group Details */}
          <div className="lg:col-span-2">
            {selectedGroupData ? (
              <div className="space-y-6">
                {/* Group Info */}
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <h3 className="font-semibold text-lg mb-4">{selectedGroupData.name}</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Devices:</span>
                          <span className="font-medium">{selectedGroupData.devices.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Online Devices:</span>
                          <span className="font-medium text-green-600">
                            {selectedGroupData.devices.filter(d => isOnline(d.lastSeen)).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Active Schedules:</span>
                          <span className="font-medium">{selectedGroupData.assignments.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Created</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedGroupData.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Devices in Group */}
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <h4 className="font-semibold text-lg mb-4">Devices in this Group</h4>
                  {selectedGroupData.devices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No devices assigned to this group yet.
                      <br />
                      <span className="text-sm">Go to Devices page to assign devices to this group.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedGroupData.devices.map((device) => {
                        const online = isOnline(device.lastSeen);
                        return (
                          <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{device.name}</div>
                              <div className="text-sm text-gray-500">Code: {device.code}</div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              online ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                online ? "bg-green-500" : "bg-gray-400"
                              }`} />
                              {online ? "Online" : "Offline"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Active Schedules */}
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6">
                  <h4 className="font-semibold text-lg mb-4">Active Schedules</h4>
                  {selectedGroupData.assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No schedules for this group yet.
                      <br />
                      <span className="text-sm">Go to Schedules page to create schedules for this group.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedGroupData.assignments.map((assignment) => {
                        const daysList = assignment.days
                          .map(d => DAYS[d.dayOfWeek])
                          .join(", ");
                        
                        return (
                          <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">{assignment.playlist.name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {assignment.startTime} - {assignment.endTime}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {daysList}
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
            ) : (
              <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
                Select a group to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}