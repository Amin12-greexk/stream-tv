"use client";
import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: "Beranda", path: "/dashboard", icon: "🏠", color: "from-blue-500 to-blue-600" },
    { label: "Media", path: "/dashboard/media", icon: "🎬", color: "from-purple-500 to-purple-600" },
    { label: "Playlist", path: "/dashboard/playlists", icon: "📋", color: "from-green-500 to-green-600" },
    { label: "Perangkat", path: "/dashboard/devices", icon: "📱", color: "from-indigo-500 to-indigo-600" },
    { label: "Grup", path: "/dashboard/groups", icon: "👥", color: "from-pink-500 to-pink-600" },
    { label: "Jadwal", path: "/dashboard/schedules", icon: "⏰", color: "from-orange-500 to-orange-600" },
    { label: "Player Manual", path: "/dashboard/manual-player", icon: "🎮", color: "from-red-500 to-red-600" },
    { label: "Log Sistem", path: "/dashboard/logs", icon: "📊", color: "from-teal-500 to-teal-600" },
    { label: "Kontrol Remote", path: "/dashboard/remote-control", icon: "📡", color: "from-cyan-500 to-cyan-600" },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl">📺</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                  TV TEI Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Sistem Manajemen Digital Signage</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                  TV TEI
                </h1>
              </div>
            </div>
            
            {/* Right Side Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* System Status - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Sistem Online</span>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-red-200"
              >
                <span className="text-base">🚪</span>
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:block pb-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap font-medium text-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'animate-bounce' : ''}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
            <nav className="px-4 py-4 space-y-2 max-h-96 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left font-medium ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
              
              {/* Mobile System Status */}
              <div className="flex items-center gap-2 px-4 py-3 mt-4 bg-green-50 rounded-xl border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Sistem Online</span>
              </div>
            </nav>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="relative">
        {/* Background overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
        
        <div className="relative z-30">
          {children}
        </div>
      </main>
      
      {/* Enhanced Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-sm">📺</span>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-gray-900">TV TEI Dashboard</p>
                <p className="text-xs text-gray-500">Sistem Manajemen Digital Signage</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>© 2025 TV TEI</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span>v2.0</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}