// src/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = { 
  title: "TV TEI - Digital Signage System",
  description: "Advanced digital signage management system for TV displays and media content"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}