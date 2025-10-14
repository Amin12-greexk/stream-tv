import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("device");
  if (!code) return NextResponse.json({ error: "Missing device" }, { status: 400 });

  const body = await req.json().catch(()=>({}));
  await prisma.device.updateMany({
    where: { code },
    data: { lastSeen: new Date(), playerVer: body.playerVer ?? null },
  });

  return NextResponse.json({ ok: true });
}
