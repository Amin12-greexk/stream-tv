// ===== src/app/api/devices/route.ts =====
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const devices = await prisma.device.findMany({
    include: { group: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devices);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, groupId } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: { name, code, groupId: groupId || null },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Device code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, groupId } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing device id" }, { status: 400 });
    }

    const device = await prisma.device.update({
      where: { id },
      data: { 
        ...(name && { name }),
        groupId: groupId === null ? null : groupId || undefined,
      },
    });

    return NextResponse.json(device);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.playLog.deleteMany({ where: { deviceId: id } });
    await prisma.device.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
  }
}