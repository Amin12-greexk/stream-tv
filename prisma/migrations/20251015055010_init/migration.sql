-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlaylistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playlistId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "displayFit" TEXT NOT NULL,
    "imageDuration" INTEGER,
    "loop" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlaylistItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PlaylistItem" ("displayFit", "id", "imageDuration", "mediaId", "order", "playlistId") SELECT "displayFit", "id", "imageDuration", "mediaId", "order", "playlistId" FROM "PlaylistItem";
DROP TABLE "PlaylistItem";
ALTER TABLE "new_PlaylistItem" RENAME TO "PlaylistItem";
CREATE INDEX "PlaylistItem_playlistId_idx" ON "PlaylistItem"("playlistId");
CREATE INDEX "PlaylistItem_mediaId_idx" ON "PlaylistItem"("mediaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
