// src/app/api/stream/[filename]/route.ts - OPTIMIZED VERSION
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Improved range parsing with validation
function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1); // Max 1MB chunks
  
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
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

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

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Check for HLS files
      const hlsMatch = filename.match(/^hls\/(.*)\/(.*)\/(.*\.(?:m3u8|ts))$/);
      if (hlsMatch) {
        const hlsPath = path.join(process.cwd(), mediaDir, 'hls', hlsMatch[1], hlsMatch[2], hlsMatch[3]);
        if (fs.existsSync(hlsPath)) {
          const stat = fs.statSync(hlsPath);
          const mimeType = getMimeType(hlsMatch[3]);
          
          // For .m3u8 files, set appropriate caching
          if (hlsMatch[3].endsWith('.m3u8')) {
            const content = fs.readFileSync(hlsPath, 'utf-8');
            return new NextResponse(content, {
              headers: {
                "Content-Type": mimeType,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
          
          // For .ts segments, allow caching
          const stream = fs.createReadStream(hlsPath);
          return new NextResponse(stream as any, {
            headers: {
              "Content-Type": mimeType,
              "Content-Length": stat.size.toString(),
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      }
      
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
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
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; media-src 'self'",
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

      // Use optimized streaming with backpressure handling
      const stream = new ReadableStream({
        async start(controller) {
          const fileStream = fs.createReadStream(filePath, { 
            start, 
            end,
            highWaterMark: 64 * 1024 // 64KB chunks for better network utilization
          });

          fileStream.on("data", (chunk) => {
            try {
              controller.enqueue(chunk);
            } catch (error) {
              // Handle backpressure
              fileStream.pause();
              setTimeout(() => fileStream.resume(), 10);
            }
          });

          fileStream.on("end", () => {
            try {
              controller.close();
            } catch (error) {
              // Controller might already be closed
            }
          });

          fileStream.on("error", (err) => {
            console.error("Stream error:", err);
            controller.error(err);
          });
        },
        cancel() {
          // Cleanup if request is cancelled
        }
      });

      return new NextResponse(stream, {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": chunkSize.toString(),
        },
      });
    }

    // For full file requests (mainly images or small files)
    if (fileSize < 1024 * 1024) { // Less than 1MB, send at once
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          ...headers,
          "Content-Length": fileSize.toString(),
        },
      });
    }

    // For larger files without range request
    const stream = new ReadableStream({
      start(controller) {
        const fileStream = fs.createReadStream(filePath, {
          highWaterMark: 64 * 1024
        });
        
        fileStream.on("data", (chunk) => {
          try {
            controller.enqueue(chunk);
          } catch (error) {
            fileStream.pause();
            setTimeout(() => fileStream.resume(), 10);
          }
        });
        
        fileStream.on("end", () => {
          try {
            controller.close();
          } catch (error) {
            // Controller might already be closed
          }
        });
        
        fileStream.on("error", (err) => {
          console.error("Stream error:", err);
          controller.error(err);
        });
      }
    });

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