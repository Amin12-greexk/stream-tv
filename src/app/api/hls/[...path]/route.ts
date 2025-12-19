import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readableToWebStream } from "@/lib/webStream";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/MP2T",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
};

const SEGMENT_CACHE = "public, max-age=3600";
const MANIFEST_CACHE = "public, max-age=15, must-revalidate";

function getMime(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    if (!pathParts || !pathParts.length) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    const safeRoot = path.join(process.cwd(), mediaDir);
    const requestedPath = path.join(safeRoot, ...pathParts);
    const normalized = path.normalize(requestedPath);

    if (!normalized.startsWith(safeRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(normalized);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      throw err;
    }

    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const mime = getMime(normalized);
    const isManifest = mime === "application/vnd.apple.mpegurl";
    const headers: HeadersInit = {
      "Content-Type": mime,
      "Content-Length": stat.size.toString(),
      "Cache-Control": isManifest ? MANIFEST_CACHE : SEGMENT_CACHE,
      "X-Content-Type-Options": "nosniff",
    };

    const fileStream = fs.createReadStream(normalized, {
      highWaterMark: isManifest ? 64 * 1024 : 256 * 1024,
    });
    const stream = readableToWebStream(fileStream, { signal: req.signal });

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error("HLS serve error:", error);
    return NextResponse.json({ error: "Failed to serve HLS" }, { status: 500 });
  }
}
