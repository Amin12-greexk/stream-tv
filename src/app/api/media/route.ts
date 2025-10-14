import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const mediaDir = process.env.MEDIA_DIR || "./storage/media";
  await fs.promises.mkdir(path.join(process.cwd(), mediaDir), { recursive: true });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "Media";
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const filename = safeName;
  const full = path.join(process.cwd(), mediaDir, filename);
  await fs.promises.writeFile(full, bytes);

  const type = file.type.startsWith("video") ? "video" : "image";
  const rec = await prisma.media.create({
    data: {
      title,
      type,
      filename,
      mime: file.type || "application/octet-stream",
      sizeBytes: bytes.length,
      tags: [],
    },
  });

  return NextResponse.json(rec, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.media.delete({ where: { id } });

  const mediaDir = process.env.MEDIA_DIR || "./storage/media";
  const full = path.join(process.cwd(), mediaDir, media.filename);
  if (fs.existsSync(full)) await fs.promises.unlink(full);

  return NextResponse.json({ ok: true });
}
