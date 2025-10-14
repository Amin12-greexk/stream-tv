import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { etagOf } from "@/lib/etag";
import { minutesNow, dowNow, timeToMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("device");
  if (!code) return NextResponse.json({ error: "Missing device" }, { status: 400 });

  const device = await prisma.device.findUnique({
    where: { code },
    include: { group: true },
  });
  if (!device || !device.groupId) return NextResponse.json({ items: [] });

  const nowM = minutesNow();
  const nowD = dowNow();

  const assignments = await prisma.assignment.findMany({
    where: { groupId: device.groupId },
    include: {
      playlist: {
        include: { items: { include: { media: true }, orderBy: { order: "asc" } } },
      },
    },
  });

  const candidates = assignments.filter(a => {
    if (!a.daysOfWeek.includes(nowD)) return false;
    const s = timeToMinutes(a.startTime);
    const e = timeToMinutes(a.endTime);
    return nowM >= s && nowM < e;
  });

  if (!candidates.length) return NextResponse.json({ items: [] });

  const chosen = candidates.sort((a,b)=>b.priority - a.priority)[0];

  const items = chosen.playlist.items
    .sort((a,b)=>a.order - b.order)
    .map((it) => ({
      id: it.id,
      type: it.media.type,
      url: `/api/stream/${it.media.filename}`,
      displayFit: it.displayFit,
      duration: it.media.type === "image" ? (it.imageDuration ?? 8) : (it.media.duration ?? undefined),
      title: it.media.title,
    }));

  const payload = { groupId: device.groupId, playlistId: chosen.playlistId, items };
  const etag = etagOf(payload);

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }
  return NextResponse.json(payload, { headers: { ETag: etag } });
}
