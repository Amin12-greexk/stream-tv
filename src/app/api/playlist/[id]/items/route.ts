// ===== src/app/api/playlists/[id]/items/route.ts - UPDATED WITH LOOP =====
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params untuk Next.js 15
    const { id: playlistId } = await params;
    const body = await req.json();
    const { mediaId, displayFit, imageDuration, loop } = body;

    if (!mediaId || !displayFit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Cari order terbesar saat ini
    const maxItem = await prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { order: "desc" },
    });

    const item = await prisma.playlistItem.create({
      data: {
        playlistId,
        mediaId,
        order: (maxItem?.order ?? -1) + 1,
        displayFit,
        imageDuration: imageDuration || null,
        // ⬇️ simpan loop (default false jika undefined)
        loop: !!loop,
      },
      include: { media: true },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to add playlist item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params untuk Next.js 15
    await params; // validasi route

    const itemId = new URL(req.url).searchParams.get("itemId");
    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    await prisma.playlistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete playlist item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
