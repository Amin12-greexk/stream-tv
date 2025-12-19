import dgram from "node:dgram";

export type WakeOptions = {
  broadcastAddress?: string;
  port?: number;
  attempts?: number;
  intervalMs?: number;
};

function normalizeMac(mac: string) {
  return mac.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

function buildMagicPacket(mac: string) {
  if (mac.length !== 12) {
    throw new Error("MAC address must be 12 hex characters");
  }

  const macBytes = mac.match(/.{2}/g)!.map((pair) => parseInt(pair, 16));
  const packet = Buffer.alloc(6 + 16 * 6, 0xff);

  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 6; j++) {
      packet[6 + i * 6 + j] = macBytes[j];
    }
  }

  return packet;
}

export async function sendWakeOnLan(macAddress: string, options: WakeOptions = {}) {
  const mac = normalizeMac(macAddress);
  const packet = buildMagicPacket(mac);
  const broadcast = options.broadcastAddress || "255.255.255.255";
  const port = options.port ?? 9;
  const attempts = options.attempts ?? 3;
  const intervalMs = options.intervalMs ?? 200;

  await new Promise<void>((resolve, reject) => {
    const socket = dgram.createSocket("udp4");

    const cleanup = (err?: Error) => {
      socket.close();
      if (err) reject(err);
      else resolve();
    };

    socket.once("error", cleanup);

    socket.bind(0, () => {
      socket.setBroadcast(true);
      let sent = 0;

      const sendPacket = () => {
        socket.send(packet, port, broadcast, (err) => {
          if (err) return cleanup(err);
          sent += 1;
          if (sent >= attempts) {
            cleanup();
          } else {
            setTimeout(sendPacket, intervalMs);
          }
        });
      };

      sendPacket();
    });
  });
}
