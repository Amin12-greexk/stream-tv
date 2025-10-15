// src/app/api/player/playlist/route.ts - PASTIKAN FILE INI ADA
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { etagOf } from "@/lib/etag";
import { minutesNow, dowNow, timeToMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("device");
    
    console.log("📡 Playlist API called for device:", code); // Debug log
    
    if (!code) {
      console.error("❌ No device code provided");
      return NextResponse.json({ error: "Missing device parameter" }, { status: 400 });
    }

    // Find device by code
    const device = await prisma.device.findUnique({
      where: { code },
      include: { group: true },
    });

    console.log("🔍 Device found:", device ? `${device.name} (Group: ${device.group?.name || 'None'})` : 'Not found');

    if (!device) {
      console.error("❌ Device not found:", code);
      return NextResponse.json({ 
        error: "Device not found", 
        items: [],
        debug: { deviceCode: code, found: false }
      }, { status: 404 });
    }

    if (!device.groupId) {
      console.warn("⚠️ Device has no group assigned:", code);
      return NextResponse.json({ 
        items: [],
        debug: { deviceCode: code, hasGroup: false, message: "Device not assigned to any group" }
      });
    }

    const nowM = minutesNow();
    const nowD = dowNow();

    console.log("⏰ Current time:", { minutes: nowM, dayOfWeek: nowD });

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

    console.log("📋 Found assignments:", assignmentsWithDays.length);

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

    console.log("🎯 Matching assignments:", candidates.length);

    if (!candidates.length) {
      console.warn("⚠️ No matching assignments for current time");
      return NextResponse.json({ 
        items: [],
        debug: { 
          deviceCode: code, 
          currentTime: nowM, 
          currentDay: nowD, 
          totalAssignments: assignments.length,
          message: "No assignments match current time/day"
        }
      });
    }

    // Get highest priority assignment
    const chosen = candidates.sort((a, b) => b.priority - a.priority)[0];

    console.log("✅ Chosen playlist:", chosen.playlist.name, "Priority:", chosen.priority);

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
      playlistName: chosen.playlist.name,
      items,
      debug: {
        deviceCode: code,
        deviceName: device.name,
        groupName: device.group?.name,
        currentTime: nowM,
        currentDay: nowD,
        assignmentCount: candidates.length,
        chosenPriority: chosen.priority
      }
    };
    
    const etag = etagOf(payload);
    const ifNoneMatch = req.headers.get("if-none-match");

    if (ifNoneMatch && ifNoneMatch === etag) {
      console.log("📦 Returning 304 - Content not modified");
      return new NextResponse(null, { 
        status: 304, 
        headers: { ETag: etag } 
      });
    }

    console.log("📤 Returning playlist with", items.length, "items");

    return NextResponse.json(payload, { 
      headers: { ETag: etag } 
    });
  } catch (error) {
    console.error("💥 Playlist API error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error",
      items: []
    }, { status: 500 });
  }
}