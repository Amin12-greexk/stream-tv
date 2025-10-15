-- CreateTable
CREATE TABLE "PlayerCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "params" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" DATETIME,
    CONSTRAINT "PlayerCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerCommand_deviceId_status_idx" ON "PlayerCommand"("deviceId", "status");

-- CreateIndex
CREATE INDEX "PlayerCommand_createdAt_idx" ON "PlayerCommand"("createdAt");
