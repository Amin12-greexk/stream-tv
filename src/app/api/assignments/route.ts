// ===== src/app/api/assignments/route.ts =====
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Jika ada query param `count=true`, kembalikan jumlah total
  if (searchParams.get("count") === "true") {
    const count = await prisma.assignment.count();
    return NextResponse.json({ count });
  }

  // Logika asli untuk mengambil semua data jadwal
  const assignments = await prisma.assignment.findMany({
    include: {
      group: true,
      playlist: true,
      days: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, playlistId, startTime, endTime, priority, daysOfWeek } = body;

    if (!groupId || !playlistId || !startTime || !endTime || priority === undefined || !Array.isArray(daysOfWeek)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        groupId,
        playlistId,
        startTime,
        endTime,
        priority,
        days: {
          create: daysOfWeek.map((day: number) => ({ dayOfWeek: day })),
        },
      },
      include: { days: true },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.assignmentDay.deleteMany({ where: { assignmentId: id } });
    await prisma.assignment.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}