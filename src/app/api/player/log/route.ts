import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("device");
  if (!code) return NextResponse.json({ error: "Missing device" }, { status: 400 });

  const device = await prisma.device.findFirst({ where: { code } });
  if (!device) return NextResponse.json({ error: "Unknown device" }, { status: 404 });

  const { entries } = await req.json().catch(()=>({ entries: [] }));
  if (!Array.isArray(entries)) return NextResponse.json({ error: "Bad payload" }, { status: 400 });

  // Expect entries: [{ mediaId, startedAt, endedAt, status, notes }]
  await prisma.playLog.createMany({
    data: entries.map((e: any) => ({
      deviceId: device.id,
      mediaId: e.mediaId,
      startedAt: e.startedAt ? new Date(e.startedAt) : new Date(),
      endedAt: e.endedAt ? new Date(e.endedAt) : null,
      status: e.status ?? "ok",
      notes: e.notes ?? null,
    })),
  });

  return NextResponse.json({ ok: true });
}
