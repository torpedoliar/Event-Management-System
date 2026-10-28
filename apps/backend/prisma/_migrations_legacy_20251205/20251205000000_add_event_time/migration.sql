-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "GuestCategory" AS ENUM ('REGULAR', 'VIP', 'VVIP', 'MEDIA', 'SPONSOR', 'SPEAKER', 'ORGANIZER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RegistrationSource" AS ENUM ('MANUAL', 'IMPORT', 'WALKIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Event
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "time" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "enablePhotoCapture" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "allowMultipleCheckin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "maxCheckinCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "allowMultipleCheckinPerCounter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "requireCheckinForSouvenir" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "checkinPopupTimeoutMs" INTEGER NOT NULL DEFAULT 5000;

-- AlterTable Guest
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "category" "GuestCategory" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "registrationSource" "RegistrationSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "checkedInById" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "checkedInByName" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "checkinCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "souvenirTaken" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);

-- AlterTable AdminUser
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make tableLocation optional (if currently NOT NULL)
ALTER TABLE "Guest" ALTER COLUMN "tableLocation" DROP NOT NULL;

-- CreateTable GuestCheckin
CREATE TABLE IF NOT EXISTS "GuestCheckin" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkinById" TEXT,
    "checkinByName" TEXT,
    "counterName" TEXT,
    CONSTRAINT "GuestCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailSettings
CREATE TABLE IF NOT EXISTS "EmailSettings" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT NOT NULL,
    "smtpPass" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "emailSubject" TEXT NOT NULL DEFAULT 'Undangan Event',
    "emailTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailLog
CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT,
    "sentByName" TEXT,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex GuestCheckin
CREATE INDEX IF NOT EXISTS "GuestCheckin_guestId_idx" ON "GuestCheckin"("guestId");
CREATE INDEX IF NOT EXISTS "GuestCheckin_checkinById_idx" ON "GuestCheckin"("checkinById");

-- CreateIndex EmailLog
CREATE INDEX IF NOT EXISTS "EmailLog_guestId_idx" ON "EmailLog"("guestId");
CREATE INDEX IF NOT EXISTS "EmailLog_eventId_idx" ON "EmailLog"("eventId");
CREATE INDEX IF NOT EXISTS "EmailLog_status_idx" ON "EmailLog"("status");

-- AddForeignKey GuestCheckin
DO $$ BEGIN
    ALTER TABLE "GuestCheckin" ADD CONSTRAINT "GuestCheckin_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey EmailLog
DO $$ BEGIN
    ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
