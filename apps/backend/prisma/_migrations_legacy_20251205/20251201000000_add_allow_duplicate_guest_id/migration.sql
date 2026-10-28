-- AlterTable
ALTER TABLE "Event" ADD COLUMN "allowDuplicateGuestId" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex (remove unique constraint on guestId per event)
DROP INDEX IF EXISTS "Guest_eventId_guestId_key";
