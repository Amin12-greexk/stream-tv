// src/app/api/stream/[filename]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Helper to parse range header
function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  return { start, end };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Await params untuk Next.js 15 compatibility
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename);
    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    const filePath = path.join(process.cwd(), mediaDir, safeName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filename).toLowerCase();

    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
      ".mp3": "audio/mp3",
      ".wav": "audio/wav",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    };

    const mimeType = mimeTypes[ext] || "application/octet-stream";
    const rangeHeader = req.headers.get("range");

    // <<< --- PERUBAHAN UTAMA DI SINI --- >>>
    // Header untuk menonaktifkan cache
    const noCacheHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    // Handle range requests (for video seeking)
    if (rangeHeader) {
      const { start, end } = parseRangeHeader(rangeHeader, fileSize);
      const chunkSize = end - start + 1;

      // Create a more robust ReadableStream
      const stream = new ReadableStream({
        start(controller) {
          const fileStream = fs.createReadStream(filePath, { start, end });
          let isEnded = false;

          fileStream.on("data", (chunk) => {
            if (!isEnded) {
              try {
                controller.enqueue(chunk);
              } catch (error) {
                if (!isEnded) {
                  console.error("Stream enqueue error:", error);
                  isEnded = true;
                  controller.error(error);
                }
              }
            }
          });

          fileStream.on("end", () => {
            if (!isEnded) {
              isEnded = true;
              try {
                controller.close();
              } catch (error) {
                console.error("Stream close error:", error);
              }
            }
          });

          fileStream.on("error", (err) => {
            if (!isEnded) {
              isEnded = true;
              console.error("File stream error:", err);
              try {
                controller.error(err);
              } catch (error) {
                console.error("Stream error handling error:", error);
              }
            }
          });
        },
        cancel() {
          // Cleanup if stream is cancelled
          console.log("Stream cancelled");
        }
      });

      return new NextResponse(stream, {
        status: 206,
        headers: {
          ...noCacheHeaders, // Terapkan header no-cache
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
        },
      });
    }

    // For non-range requests, use a simpler approach
    try {
      const fileBuffer = fs.readFileSync(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          ...noCacheHeaders, // Terapkan header no-cache
          "Content-Length": fileSize.toString(),
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes",
        },
      });
    } catch (error) {
      console.error("File read error:", error);
      return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
    }

  } catch (error) {
    console.error("Streaming error:", error);
    return NextResponse.json({ error: "Streaming failed" }, { status: 500 });
  }
}