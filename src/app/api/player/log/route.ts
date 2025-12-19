// src/app/api/player/log/route.ts - PASTIKAN FILE INI ADA
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PlayLogEntryInput = {
  mediaId: string;
  startedAt?: string;
  endedAt?: string;
  status?: string;
  notes?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("device");
    
    console.log("📝 Log from device:", code); // Debug log
    
    if (!code) {
      console.error("❌ No device code in log");
      return NextResponse.json({ error: "Missing device parameter" }, { status: 400 });
    }

    const device = await prisma.device.findFirst({ where: { code } });
    if (!device) {
      console.error("❌ Unknown device in log:", code);
      return NextResponse.json({ error: "Unknown device" }, { status: 404 });
    }

    const { entries } = await req.json().catch(() => ({ entries: [] }));
    if (!Array.isArray(entries)) {
      console.error("❌ Bad log payload from device:", code);
      return NextResponse.json({ error: "Bad payload - entries must be array" }, { status: 400 });
    }

    console.log("📝 Processing", entries.length, "log entries from device:", code);

    // Expect entries: [{ mediaId, startedAt, endedAt, status, notes }]
    if (entries.length > 0) {
      await prisma.playLog.createMany({
        data: (entries as PlayLogEntryInput[]).map((e) => ({
          deviceId: device.id,
          mediaId: e.mediaId,
          startedAt: e.startedAt ? new Date(e.startedAt) : new Date(),
          endedAt: e.endedAt ? new Date(e.endedAt) : null,
          status: e.status ?? "ok",
          notes: e.notes ?? null,
        })),
      });

      console.log("✅ Saved", entries.length, "log entries for device:", code);
    }

    return NextResponse.json({ 
      ok: true, 
      processed: entries.length,
      deviceCode: code,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("💥 Log API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
