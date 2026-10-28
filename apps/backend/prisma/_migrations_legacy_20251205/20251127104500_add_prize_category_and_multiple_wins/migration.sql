-- AlterTable
ALTER TABLE "Prize" ADD COLUMN     "allowMultipleWins" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'HIBURAN';

-- AlterTable
ALTER TABLE "Guest" DROP COLUMN "wonPrizeId";

-- CreateTable
CREATE TABLE "PrizeWinner" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "wonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrizeWinner_guestId_prizeId_key" ON "PrizeWinner"("guestId", "prizeId");

-- AddForeignKey
ALTER TABLE "PrizeWinner" ADD CONSTRAINT "PrizeWinner_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeWinner" ADD CONSTRAINT "PrizeWinner_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
