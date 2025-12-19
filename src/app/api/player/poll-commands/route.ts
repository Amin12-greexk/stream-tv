import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_WAIT_MS = 25_000;
const DEFAULT_POLL_INTERVAL_MS = 300;
const MIN_POLL_INTERVAL_MS = 100;
const MAX_POLL_INTERVAL_MS = 2_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceCode = searchParams.get("device");
    const waitMsRaw = searchParams.get("waitMs");
    const pollIntervalMsRaw = searchParams.get("pollIntervalMs");
    const limitRaw = searchParams.get("limit");
    
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

    const waitMs = clampInt(parseInt(waitMsRaw || "0", 10), 0, MAX_WAIT_MS);
    const pollIntervalMs = clampInt(
      parseInt(pollIntervalMsRaw || `${DEFAULT_POLL_INTERVAL_MS}`, 10),
      MIN_POLL_INTERVAL_MS,
      MAX_POLL_INTERVAL_MS
    );
    const limit = clampInt(parseInt(limitRaw || `${DEFAULT_LIMIT}`, 10), 1, MAX_LIMIT);

    const startedAt = Date.now();

    const loadPending = async () => {
      return prisma.playerCommand.findMany({
        where: {
          deviceId: device.id,
          status: "pending",
        },
        select: {
          id: true,
          command: true,
          params: true,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
    };

    // Long-poll: if no commands, wait up to waitMs for new ones.
    let commands = await loadPending();
    while (!commands.length && waitMs > 0) {
      if (req.signal.aborted) break;
      const elapsed = Date.now() - startedAt;
      if (elapsed >= waitMs) break;

      const remaining = waitMs - elapsed;
      const sleepMs = Math.min(pollIntervalMs, remaining);
      await new Promise<void>((resolve) => setTimeout(resolve, sleepMs));

      if (req.signal.aborted) break;
      commands = await loadPending();
    }

    return NextResponse.json({ 
      commands: commands.map(cmd => ({
        id: cmd.id,
        command: cmd.command,
        params: cmd.params
      })),
      waitedMs: Math.min(Date.now() - startedAt, waitMs)
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
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
    const { commandId, status } = body;
    
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
