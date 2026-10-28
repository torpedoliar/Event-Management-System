-- CreateTable
CREATE TABLE "Souvenir" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Souvenir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirTake" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "souvenirId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenById" TEXT,
    "takenByName" TEXT,

    CONSTRAINT "SouvenirTake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeCollection" (
    "id" TEXT NOT NULL,
    "prizeWinnerId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" TEXT,
    "collectedByName" TEXT,

    CONSTRAINT "PrizeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Souvenir_eventId_idx" ON "Souvenir"("eventId");

-- CreateIndex
CREATE INDEX "SouvenirTake_guestId_idx" ON "SouvenirTake"("guestId");

-- CreateIndex
CREATE INDEX "SouvenirTake_souvenirId_idx" ON "SouvenirTake"("souvenirId");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirTake_guestId_souvenirId_key" ON "SouvenirTake"("guestId", "souvenirId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeCollection_prizeWinnerId_key" ON "PrizeCollection"("prizeWinnerId");

-- CreateIndex
CREATE INDEX "Guest_eventId_idx" ON "Guest"("eventId");

-- CreateIndex
CREATE INDEX "Guest_eventId_checkedIn_idx" ON "Guest"("eventId", "checkedIn");

-- CreateIndex
CREATE INDEX "Guest_eventId_guestId_idx" ON "Guest"("eventId", "guestId");

-- CreateIndex
CREATE INDEX "Guest_queueNumber_idx" ON "Guest"("queueNumber");

-- CreateIndex
CREATE INDEX "Prize_eventId_idx" ON "Prize"("eventId");

-- CreateIndex
CREATE INDEX "PrizeWinner_guestId_idx" ON "PrizeWinner"("guestId");

-- CreateIndex
CREATE INDEX "PrizeWinner_prizeId_idx" ON "PrizeWinner"("prizeId");

-- AddForeignKey
ALTER TABLE "Souvenir" ADD CONSTRAINT "Souvenir_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirTake" ADD CONSTRAINT "SouvenirTake_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirTake" ADD CONSTRAINT "SouvenirTake_souvenirId_fkey" FOREIGN KEY ("souvenirId") REFERENCES "Souvenir"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeCollection" ADD CONSTRAINT "PrizeCollection_prizeWinnerId_fkey" FOREIGN KEY ("prizeWinnerId") REFERENCES "PrizeWinner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
