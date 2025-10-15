// src/app/api/player/heartbeat/route.ts - PASTIKAN FILE INI ADA
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("device");
    
    console.log("💓 Heartbeat from device:", code); // Debug log
    
    if (!code) {
      console.error("❌ No device code in heartbeat");
      return NextResponse.json({ error: "Missing device parameter" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    
    // Update device last seen time and player version
    const result = await prisma.device.updateMany({
      where: { code },
      data: { 
        lastSeen: new Date(), 
        playerVer: body.playerVer ?? null 
      },
    });

    if (result.count === 0) {
      console.warn("⚠️ Device not found for heartbeat:", code);
      return NextResponse.json({ 
        error: "Device not found", 
        deviceCode: code 
      }, { status: 404 });
    }

    console.log("✅ Heartbeat updated for device:", code);

    return NextResponse.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      deviceCode: code
    });
  } catch (error) {
    console.error("💥 Heartbeat error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}