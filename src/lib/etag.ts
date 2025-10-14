import crypto from "crypto";

export function etagOf(obj: unknown) {
  const json = JSON.stringify(obj);
  return crypto.createHash("sha256").update(json).digest("hex");
}
