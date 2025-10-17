// src/app/(auth)/layout.tsx
"use client";
import "../globals.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ❗️ REMOVED <html> and <body> tags
  return (
    // ✨ MOVED the classNames to this div
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="min-h-screen flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}