// ===== src/app/api/groups/route.ts =====
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await prisma.deviceGroup.findMany({
    include: { 
      devices: true,
      assignments: {
        include: {
          playlist: true,
          days: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const group = await prisma.deviceGroup.create({
      data: { name },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Group name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Remove group reference from devices
    await prisma.device.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });

    // Delete assignments
    const assignments = await prisma.assignment.findMany({ where: { groupId: id } });
    for (const assignment of assignments) {
      await prisma.assignmentDay.deleteMany({ where: { assignmentId: assignment.id } });
    }
    await prisma.assignment.deleteMany({ where: { groupId: id } });

    // Delete group
    await prisma.deviceGroup.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}