// src/app/api/media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await prisma.media.findMany({ 
    orderBy: { createdAt: "desc" },
    include: { mediaTags: true }
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  try {
    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    await fs.promises.mkdir(path.join(process.cwd(), mediaDir), { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Media";
    
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filename = safeName;
    const full = path.join(process.cwd(), mediaDir, filename);
    await fs.promises.writeFile(full, bytes);

    const type = file.type.startsWith("video") ? "video" : "image";
    
    // Get duration for video files (simplified - you may want to use ffprobe)
    let duration = null;
    if (type === "video") {
      // Placeholder: implement video duration detection if needed
      duration = null;
    }

    const rec = await prisma.media.create({
      data: {
        title,
        type,
        filename,
        mime: file.type || "application/octet-stream",
        sizeBytes: bytes.length,
        duration,
      },
    });

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

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete related records first
    await prisma.mediaTag.deleteMany({ where: { mediaId: id } });
    await prisma.playlistItem.deleteMany({ where: { mediaId: id } });
    
    // Delete media record
    await prisma.media.delete({ where: { id } });

    // Delete file
    const mediaDir = process.env.MEDIA_DIR || "./storage/media";
    const full = path.join(process.cwd(), mediaDir, media.filename);
    if (fs.existsSync(full)) {
      await fs.promises.unlink(full);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}