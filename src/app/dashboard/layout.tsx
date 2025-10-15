"use client";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { label: "Overview", path: "/dashboard", icon: "🏠" },
    { label: "Media", path: "/dashboard/media", icon: "🎬" },
    { label: "Playlists", path: "/dashboard/playlists", icon: "📋" },
    { label: "Devices", path: "/dashboard/devices", icon: "📱" },
    { label: "Groups", path: "/dashboard/groups", icon: "👥" },
    { label: "Schedules", path: "/dashboard/schedules", icon: "⏰" },
    { label: "Manual Player", path: "/dashboard/manual-player", icon: "🎮" },
    { label: "Logs", path: "/dashboard/logs", icon: "📊" },
    { label: "Remote Control", path: "/dashboard/remote-control", icon: "🎮" },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-green-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">📺</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-600">
                TV TEI Dashboard
              </h1>
              <p className="text-sm text-gray-600">Digital Signage Management</p>
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 font-medium"
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex gap-1 px-6 pb-2 overflow-x-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`nav-link ${pathname === item.path ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="card min-h-[calc(100vh-200px)]">
            {children}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-green-100 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2025 TV TEI - Digital Signage Management System</p>
        </div>
      </footer>
    </div>
  );
}

