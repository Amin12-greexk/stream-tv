// src/app/api/media/route.ts - OPTIMIZED VERSION
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VideoTranscoder } from "@/lib/videoTranscoding";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Implementasi cache in-memory untuk mengurangi database queries
const mediaCache = new Map();
const CACHE_TTL = 60000; // 1 menit

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Check cache first
  const cacheKey = `media_${searchParams.toString()}`;
  const cached = mediaCache.get(cacheKey);
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  if (searchParams.get("count") === "true") {
    const count = await prisma.media.count();
    const data = { count };
    mediaCache.set(cacheKey, { data, timestamp: Date.now() });
    return NextResponse.json(data);
  }

  // Optimized query dengan field selection
  const list = await prisma.media.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      filename: true,
      mime: true,
      duration: true,
      sizeBytes: true,
      hlsPath: true,
      thumbnailPath: true,
      createdAt: true,
      mediaTags: {
        select: {
          id: true,
          tag: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100 // Limit untuk performa
  });
  
  mediaCache.set(cacheKey, { data: list, timestamp: Date.now() });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  try {
    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    await fs.promises.mkdir(path.join(process.cwd(), mediaDir), { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Media";
    const enableHLS = formData.get("enableHLS") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filename = safeName;
    const fullPath = path.join(process.cwd(), mediaDir, filename);
    
    await fs.promises.writeFile(fullPath, bytes);

    const type = file.type.startsWith("video") ? "video" : "image";
    let duration = null;
    let hlsPath = null;
    let thumbnailPath = null;

    if (type === "video") {
      // Get video duration
      try {
        duration = await VideoTranscoder.getVideoDuration(fullPath);
      } catch (error) {
        console.error("Failed to get video duration:", error);
      }

      // Generate thumbnail
      try {
        thumbnailPath = `thumbnails/${safeName}.jpg`;
        const thumbFullPath = path.join(process.cwd(), mediaDir, thumbnailPath);
        await fs.promises.mkdir(path.dirname(thumbFullPath), { recursive: true });
        await VideoTranscoder.generateThumbnail(fullPath, thumbFullPath);
      } catch (error) {
        console.error("Failed to generate thumbnail:", error);
      }

      // Generate HLS if enabled and file is large (> 10MB)
      if (enableHLS && bytes.length > 10 * 1024 * 1024) {
        try {
          hlsPath = await VideoTranscoder.generateHLS({
            inputPath: fullPath,
            outputDir: mediaDir,
            filename
          });
        } catch (error) {
          console.error("Failed to generate HLS:", error);
        }
      }
    } else if (type === "image") {
      // Optimize images
      try {
        await VideoTranscoder.optimizeImage(fullPath, fullPath);
      } catch (error) {
        console.error("Failed to optimize image:", error);
      }
    }

    const rec = await prisma.media.create({
      data: {
        title,
        type,
        filename,
        mime: file.type || "application/octet-stream",
        sizeBytes: bytes.length,
        duration,
        hlsPath,
        thumbnailPath,
      },
    });

    // Clear cache
    mediaCache.clear();

    return NextResponse.json(rec, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const media = await prisma.media.findUnique({ 
      where: { id },
      select: { filename: true, hlsPath: true, thumbnailPath: true }
    });
    
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete related records first
    await prisma.mediaTag.deleteMany({ where: { mediaId: id } });
    await prisma.playlistItem.deleteMany({ where: { mediaId: id } });
    await prisma.media.delete({ where: { id } });

    // Delete files
    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    
    // Delete original file
    const fullPath = path.join(process.cwd(), mediaDir, media.filename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
    
    // Delete HLS files if exist
    if (media.hlsPath) {
      const hlsFullPath = path.join(process.cwd(), mediaDir, media.hlsPath);
      const hlsDir = path.dirname(hlsFullPath);
      if (fs.existsSync(hlsDir)) {
        await fs.promises.rm(hlsDir, { recursive: true, force: true });
      }
    }
    
    // Delete thumbnail if exists
    if (media.thumbnailPath) {
      const thumbPath = path.join(process.cwd(), mediaDir, media.thumbnailPath);
      if (fs.existsSync(thumbPath)) {
        await fs.promises.unlink(thumbPath);
      }
    }

    // Clear cache
    mediaCache.clear();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
