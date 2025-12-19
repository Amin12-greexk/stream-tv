import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWakeOnLan } from "@/lib/wake";

export const dynamic = "force-dynamic";

type WakeMethod = "wol" | "wowlan";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      deviceId,
      deviceCode,
      macAddress: overrideMac,
      broadcastIp,
      port,
      method = "wol",
    }: {
      deviceId?: string;
      deviceCode?: string;
      macAddress?: string;
      broadcastIp?: string;
      port?: number;
      method?: WakeMethod;
    } = body;

    if (!deviceId && !deviceCode) {
      return NextResponse.json(
        { error: "deviceId or deviceCode is required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.findFirst({
      where: deviceId ? { id: deviceId } : { code: deviceCode! },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const macAddress = overrideMac || device.macAddress;
    if (!macAddress) {
      return NextResponse.json(
        { error: "Device is missing a MAC address" },
        { status: 422 }
      );
    }

    const wolAllowed =
      method === "wowlan" ? device.wowlanEnabled : device.wolEnabled;

    if (!wolAllowed) {
      return NextResponse.json(
        { error: `Wake method '${method}' is disabled for this device` },
        { status: 409 }
      );
    }

    await sendWakeOnLan(macAddress, {
      broadcastAddress: broadcastIp || device.broadcast || undefined,
      port: port ?? device.wolPort ?? 9,
    });

    return NextResponse.json({
      success: true,
      method,
      deviceId: device.id,
      broadcast: broadcastIp || device.broadcast || "255.255.255.255",
      port: port ?? device.wolPort ?? 9,
    });
  } catch (error) {
    console.error("Wake API error:", error);
    return NextResponse.json(
      { error: "Failed to send wake signal" },
      { status: 500 }
    );
  }
}
