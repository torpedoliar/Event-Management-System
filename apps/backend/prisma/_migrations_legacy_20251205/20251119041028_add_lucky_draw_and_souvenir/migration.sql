-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "enableLuckyDraw" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableSouvenir" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "souvenirTaken" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wonPrizeId" TEXT;

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_wonPrizeId_fkey" FOREIGN KEY ("wonPrizeId") REFERENCES "Prize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
