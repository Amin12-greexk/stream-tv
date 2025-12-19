// src/app/api/stream/[filename]/route.ts - OPTIMIZED AND FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readableToWebStream } from "@/lib/webStream";

export const dynamic = "force-dynamic";

// Improved range parsing with validation
function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 4 * 1024 * 1024, fileSize - 1); // Default max 4MB chunks
  
  if (isNaN(start) || start >= fileSize || (end && start > end)) {
    return null;
  }
  
  return { 
    start: Math.max(0, start), 
    end: Math.min(end, fileSize - 1) 
  };
}

// Mime type helper with more types
const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".m3u8": "application/x-mpegURL",
    ".ts": "video/MP2T"
  };
  return mimeTypes[ext] || "application/octet-stream";
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params; // <-- PERBAIKAN DI SINI

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    if (safeName !== filename || filename.includes("..")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    const filePath = path.join(process.cwd(), mediaDir, safeName);

    let fileSize = 0;
    try {
      const stat = await fs.promises.stat(filePath);
      fileSize = stat.size;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      throw err;
    }
    const mimeType = getMimeType(filename);
    
    // Enhanced caching strategy
    const isVideo = mimeType.startsWith("video/");
    const isImage = mimeType.startsWith("image/");
    
    let cacheControl = "no-store, no-cache, must-revalidate, private";
    if (isImage) {
      cacheControl = "public, max-age=604800, immutable"; // 7 days for images
    } else if (isVideo) {
      cacheControl = "public, max-age=3600"; // 1 hour for video segments
    }

    const headers: HeadersInit = {
      "Accept-Ranges": "bytes",
      "Content-Type": mimeType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    };

    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, fileSize);
      
      if (!range) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const { start, end } = range;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, {
        start,
        end,
        highWaterMark: 256 * 1024, // 256KB chunks for LAN throughput
      });
      const stream = readableToWebStream(fileStream, { signal: req.signal });

      return new NextResponse(stream, {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": chunkSize.toString(),
        },
      });
    }

    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: 256 * 1024,
    });
    const stream = readableToWebStream(fileStream, { signal: req.signal });

    return new NextResponse(stream, {
      headers: {
        ...headers,
        "Content-Length": fileSize.toString(),
      },
    });

  } catch (error) {
    console.error("Streaming error:", error);
    return NextResponse.json({ error: "Streaming failed" }, { status: 500 });
  }
}
