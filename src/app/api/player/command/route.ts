import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceCode, command, params } = body;
    
    if (!deviceCode || !command) {
      return NextResponse.json({ 
        error: "Missing deviceCode or command" 
      }, { status: 400 });
    }

    // Find device
    const device = await prisma.device.findUnique({
      where: { code: deviceCode }
    });

    if (!device) {
      return NextResponse.json({ 
        error: "Device not found" 
      }, { status: 404 });
    }

    // Create command
    const playerCommand = await prisma.playerCommand.create({
      data: {
        deviceId: device.id,
        command,
        params: params || null,
        status: "pending"
      }
    });

    return NextResponse.json({ 
      success: true, 
      commandId: playerCommand.id,
      message: `Command '${command}' sent to device ${deviceCode}`
    });
  } catch (error) {
    console.error("Command API error:", error);
    return NextResponse.json({ 
      error: "Failed to send command" 
    }, { status: 500 });
  }
}

// Get command history for a device
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceCode = searchParams.get("device");
    
    if (!deviceCode) {
      return NextResponse.json({ 
        error: "Missing device parameter" 
      }, { status: 400 });
    }

    const device = await prisma.device.findUnique({
      where: { code: deviceCode },
      include: {
        commands: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!device) {
      return NextResponse.json({ 
        error: "Device not found" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      commands: device.commands 
    });
  } catch (error) {
    console.error("Get commands error:", error);
    return NextResponse.json({ 
      error: "Failed to get commands" 
    }, { status: 500 });
  }
}