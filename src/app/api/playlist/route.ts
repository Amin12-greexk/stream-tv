// ===== src/app/api/playlists/route.ts =====
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const playlists = await prisma.playlist.findMany({
    include: {
      items: {
        include: { media: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(playlists);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const playlist = await prisma.playlist.create({
      data: { name },
    });

    return NextResponse.json(playlist, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Playlist name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.playlistItem.deleteMany({ where: { playlistId: id } });
    await prisma.assignment.deleteMany({ where: { playlistId: id } });
    await prisma.playlist.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}