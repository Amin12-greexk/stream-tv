
// ===== src/app/api/playlists/[id]/items/route.ts =====
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = params.id;
    const body = await req.json();
    const { mediaId, displayFit, imageDuration } = body;

    if (!mediaId || !displayFit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get max order
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
      },
      include: { media: true },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = new URL(req.url).searchParams.get("itemId");
    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    await prisma.playlistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}