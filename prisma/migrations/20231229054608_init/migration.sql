-- CreateTable
CREATE TABLE "Username" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "relays" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "History" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tweetId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "eventId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Username_username_key" ON "Username"("username");

-- CreateIndex
CREATE UNIQUE INDEX "History_eventId_key" ON "History"("eventId");
