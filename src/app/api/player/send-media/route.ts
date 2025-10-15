// src/app/api/player/send-media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { deviceCode, playlist, playImmediately } = await req.json();

    if (!deviceCode || !playlist?.items?.length) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Cari device berdasarkan code
    const device = await prisma.device.findUnique({
      where: { code: deviceCode },
    });
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Tambahkan perintah ke tabel PlayerCommand (atau logika lain sesuai kebutuhan)
    await prisma.playerCommand.create({
      data: {
        deviceId: device.id,
        command: "play",
        params: { playlist, playImmediately },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-media error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
