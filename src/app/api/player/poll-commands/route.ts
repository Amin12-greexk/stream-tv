import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
      where: { code: deviceCode }
    });

    if (!device) {
      return NextResponse.json({ 
        error: "Device not found" 
      }, { status: 404 });
    }

    // Get pending commands
    const commands = await prisma.playerCommand.findMany({
      where: {
        deviceId: device.id,
        status: "pending"
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ 
      commands: commands.map(cmd => ({
        id: cmd.id,
        command: cmd.command,
        params: cmd.params
      }))
    });
  } catch (error) {
    console.error("Poll commands error:", error);
    return NextResponse.json({ 
      error: "Failed to poll commands" 
    }, { status: 500 });
  }
}

// Mark command as executed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commandId, status, error: cmdError } = body;
    
    if (!commandId) {
      return NextResponse.json({ 
        error: "Missing commandId" 
      }, { status: 400 });
    }

    await prisma.playerCommand.update({
      where: { id: commandId },
      data: {
        status: status || "executed",
        executedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update command status error:", error);
    return NextResponse.json({ 
      error: "Failed to update command status" 
    }, { status: 500 });
  }
}