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
    const { 
      name, 
      code, 
      groupId,
      ipAddress,
      macAddress,
      broadcast,
      wolEnabled,
      wowlanEnabled,
      wolPort,
      ipControlEnabled,
      ipControlPin,
      ipControlPort
    } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: { 
        name, 
        code, 
        groupId: groupId || null,
        ipAddress: ipAddress || null,
        macAddress: macAddress || null,
        broadcast: broadcast || null,
        wolEnabled: wolEnabled ?? false,
        wowlanEnabled: wowlanEnabled ?? false,
        wolPort: wolPort ?? 9,
        ipControlEnabled: ipControlEnabled ?? false,
        ipControlPin: ipControlPin || null,
        ipControlPort: ipControlPort ?? 10002
      },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Device code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      id, 
      name, 
      groupId,
      ipAddress,
      macAddress,
      broadcast,
      wolEnabled,
      wowlanEnabled,
      wolPort,
      ipControlEnabled,
      ipControlPin,
      ipControlPort
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing device id" }, { status: 400 });
    }

    const device = await prisma.device.update({
      where: { id },
      data: { 
        ...(name && { name }),
        groupId: groupId === null ? null : groupId || undefined,
        ipAddress: ipAddress === undefined ? undefined : ipAddress || null,
        macAddress: macAddress === undefined ? undefined : macAddress || null,
        broadcast: broadcast === undefined ? undefined : broadcast || null,
        wolEnabled: wolEnabled === undefined ? undefined : wolEnabled,
        wowlanEnabled: wowlanEnabled === undefined ? undefined : wowlanEnabled,
        wolPort: wolPort === undefined ? undefined : wolPort,
        ipControlEnabled: ipControlEnabled === undefined ? undefined : ipControlEnabled,
        ipControlPin: ipControlPin === undefined ? undefined : (ipControlPin || null),
        ipControlPort: ipControlPort === undefined ? undefined : ipControlPort
      },
    });

    return NextResponse.json(device);
  } catch {
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
  } catch {
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
  }
}
