-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Username" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "relays" TEXT NOT NULL,
    "bunkerUrl" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "nextScan" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00'
);
INSERT INTO "new_Username" ("bunkerUrl", "id", "relays", "secretKey", "username") SELECT "bunkerUrl", "id", "relays", "secretKey", "username" FROM "Username";
DROP TABLE "Username";
ALTER TABLE "new_Username" RENAME TO "Username";
CREATE UNIQUE INDEX "Username_username_key" ON "Username"("username");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
