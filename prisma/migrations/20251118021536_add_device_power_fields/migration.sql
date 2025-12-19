-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "groupId" TEXT,
    "lastSeen" DATETIME,
    "playerVer" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "broadcast" TEXT,
    "wolPort" INTEGER NOT NULL DEFAULT 9,
    "wolEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wowlanEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ipControlEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ipControlPin" TEXT,
    "ipControlPort" INTEGER NOT NULL DEFAULT 10002,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DeviceGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Device" ("code", "createdAt", "groupId", "id", "lastSeen", "name", "playerVer") SELECT "code", "createdAt", "groupId", "id", "lastSeen", "name", "playerVer" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");
CREATE INDEX "Device_groupId_idx" ON "Device"("groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
