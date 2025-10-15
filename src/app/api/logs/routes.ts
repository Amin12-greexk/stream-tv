// src/app/api/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    const limit = searchParams.get("limit");
    
    const logs = await prisma.playLog.findMany({
      where: deviceId ? { deviceId } : undefined,
      include: {
        device: true,
        media: true,
      },
      orderBy: { startedAt: "desc" },
      take: limit ? parseInt(limit) : 100, // Default to last 100 logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}