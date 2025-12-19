import { NextRequest, NextResponse } from "next/server";
import { sendWakeOnLan } from "@/lib/wake";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mac = (body?.mac as string | undefined)?.trim();
    const broadcast = (body?.broadcast as string | undefined)?.trim() || "255.255.255.255";
    const port = body?.port ? parseInt(body.port, 10) : 9;
    const attempts = body?.attempts ? parseInt(body.attempts, 10) : 3;
    const intervalMs = body?.intervalMs ? parseInt(body.intervalMs, 10) : 200;

    if (!mac) {
      return NextResponse.json({ error: "MAC address required" }, { status: 400 });
    }

    await sendWakeOnLan(mac, {
      broadcastAddress: broadcast,
      port,
      attempts,
      intervalMs,
    });

    return NextResponse.json({
      ok: true,
      mac,
      broadcast,
      port,
      attempts,
      intervalMs,
    });
  } catch (error) {
    console.error("Wake API error:", error);
    return NextResponse.json({ error: "Failed to send WOL" }, { status: 500 });
  }
}
