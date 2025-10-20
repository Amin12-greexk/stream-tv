// src/app/api/stream/[filename]/route.ts - PERBAIKAN LENGKAP
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Fungsi bantuan untuk mem-parsing header "range"
function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  return { start, end };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Membersihkan nama file untuk mencegah directory traversal
    const safeName = path.basename(filename);
    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    const filePath = path.join(process.cwd(), mediaDir, safeName);

    // Memeriksa apakah file ada
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filename).toLowerCase();

    // Menentukan tipe MIME
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
    
    // Header untuk menonaktifkan cache, memastikan player selalu mendapat versi terbaru
    const noCacheHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    const rangeHeader = req.headers.get("range");

    // Menangani permintaan range (untuk seeking video)
    if (rangeHeader) {
      const { start, end } = parseRangeHeader(rangeHeader, fileSize);
      const chunkSize = end - start + 1;

      // Membuat ReadableStream yang lebih tangguh untuk streaming
      const stream = new ReadableStream({
        start(controller) {
          const fileStream = fs.createReadStream(filePath, { start, end });
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(stream, {
        status: 206, // Partial Content
        headers: {
          ...noCacheHeaders,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
        },
      });
    }

    // Menangani permintaan file penuh (untuk gambar atau video yang dimuat pertama kali)
    const stream = new ReadableStream({
      start(controller) {
        const fileStream = fs.createReadStream(filePath);
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(stream, {
      headers: {
        ...noCacheHeaders,
        "Content-Length": fileSize.toString(),
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
      },
    });

  } catch (error) {
    console.error("Streaming error:", error);
    return NextResponse.json({ error: "Streaming failed" }, { status: 500 });
  }
}