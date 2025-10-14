// src/app/api/player/playlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { etagOf } from "@/lib/etag";
import { minutesNow, dowNow, timeToMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("device");
    
    if (!code) {
      return NextResponse.json({ error: "Missing device" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { code },
      include: { group: true },
    });

    if (!device || !device.groupId) {
      return NextResponse.json({ items: [] });
    }

    const nowM = minutesNow();
    const nowD = dowNow();

    // Get all assignments for this device group with their days
    const assignmentsWithDays = await prisma.assignment.findMany({
      where: { groupId: device.groupId },
      include: {
        playlist: {
          include: { 
            items: { 
              include: { media: true }, 
              orderBy: { order: "asc" } 
            } 
          },
        },
        days: true,
      },
    });

    // Get assignment days separately to ensure we have them
    const assignmentIds = assignmentsWithDays.map(a => a.id);
    const allDays = await prisma.assignmentDay.findMany({
      where: { assignmentId: { in: assignmentIds } },
    });

    // Map days to assignments
    const assignments = assignmentsWithDays.map(assignment => ({
      ...assignment,
      days: allDays.filter(d => d.assignmentId === assignment.id),
    }));

    // Filter assignments that match current day and time
    const candidates = assignments.filter(a => {
      // Check if current day is in assignment days
      const dayMatch = a.days.some(d => d.dayOfWeek === nowD);
      if (!dayMatch) return false;

      // Check if current time is within assignment time range
      const s = timeToMinutes(a.startTime);
      const e = timeToMinutes(a.endTime);
      
      // Handle time ranges that cross midnight
      if (e < s) {
        return nowM >= s || nowM < e;
      }
      
      return nowM >= s && nowM < e;
    });

    if (!candidates.length) {
      return NextResponse.json({ items: [] });
    }

    // Get highest priority assignment
    const chosen = candidates.sort((a, b) => b.priority - a.priority)[0];

    // Build playlist items
    const items = chosen.playlist.items
      .sort((a, b) => a.order - b.order)
      .map((it) => ({
        id: it.id,
        mediaId: it.mediaId,
        type: it.media.type,
        url: `/api/stream/${it.media.filename}`,
        displayFit: it.displayFit,
        duration: it.media.type === "image" 
          ? (it.imageDuration ?? 8) 
          : (it.media.duration ?? undefined),
        title: it.media.title,
      }));

    const payload = { 
      groupId: device.groupId, 
      playlistId: chosen.playlistId, 
      items 
    };
    
    const etag = etagOf(payload);
    const ifNoneMatch = req.headers.get("if-none-match");

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304, 
        headers: { ETag: etag } 
      });
    }

    return NextResponse.json(payload, { 
      headers: { ETag: etag } 
    });
  } catch (error) {
    console.error("Playlist error:", error);
    return NextResponse.json({ error: "Failed to get playlist" }, { status: 500 });
  }
}