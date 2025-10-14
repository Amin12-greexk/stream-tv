// ===== 3. UPDATED DASHBOARD LAYOUT =====
// src/app/(dashboard)/layout.tsx
"use client";
import { ReactNode, JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { label: "Overview", path: "/dashboard" },
    { label: "Media", path: "/dashboard/media" },
    { label: "Playlists", path: "/dashboard/playlists" },
    { label: "Devices", path: "/dashboard/devices" },
    { label: "Groups", path: "/dashboard/groups" },
    { label: "Schedules", path: "/dashboard/schedules" },
    { label: "Logs", path: "/dashboard/logs" },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <section className="min-h-screen grid grid-rows-[auto_1fr] bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">📺</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">TV TEI Dashboard</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-green-600 font-medium underline transition"
          >
            Logout
          </button>
        </div>
        <nav className="flex gap-1 px-6 pb-2 overflow-x-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
                pathname === item.path
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-green-50 hover:text-green-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </div>
    </section>
  );
}