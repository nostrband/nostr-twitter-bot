/*
  Warnings:

  - Added the required column `bunkerUrl` to the `Username` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Username" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "relays" TEXT NOT NULL,
    "bunkerUrl" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL
);
INSERT INTO "new_Username" ("id", "relays", "secretKey", "username") SELECT "id", "relays", "secretKey", "username" FROM "Username";
DROP TABLE "Username";
ALTER TABLE "new_Username" RENAME TO "Username";
CREATE UNIQUE INDEX "Username_username_key" ON "Username"("username");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
