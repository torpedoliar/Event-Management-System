-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('FUTSAL', 'BASKET', 'VOLLEY', 'BADMINTON', 'CHESS', 'ESPORTS', 'OTHER');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS', 'GROUP_KNOCKOUT');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('TEAM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('SIMPLE', 'SETS', 'POINTS');

-- CreateEnum
CREATE TYPE "SchedulingMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'WALKOVER');

-- CreateEnum
CREATE TYPE "EventBackgroundType" AS ENUM ('NONE', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "GuestCategory" AS ENUM ('REGULAR', 'VIP', 'VVIP', 'MEDIA', 'SPONSOR', 'SPEAKER', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('MANUAL', 'IMPORT', 'WALKIN', 'PUBLIC');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "location" TEXT,
    "logoUrl" TEXT,
    "backgroundType" "EventBackgroundType" NOT NULL DEFAULT 'NONE',
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "overlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "checkinPopupTimeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "enablePhotoCapture" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "enableLuckyDraw" BOOLEAN NOT NULL DEFAULT false,
    "enableSouvenir" BOOLEAN NOT NULL DEFAULT false,
    "allowDuplicateGuestId" BOOLEAN NOT NULL DEFAULT false,
    "allowMultipleCheckin" BOOLEAN NOT NULL DEFAULT false,
    "maxCheckinCount" INTEGER NOT NULL DEFAULT 1,
    "allowMultipleCheckinPerCounter" BOOLEAN NOT NULL DEFAULT false,
    "requireCheckinForSouvenir" BOOLEAN NOT NULL DEFAULT true,
    "customCategories" JSONB,
    "allowOfflineMode" BOOLEAN NOT NULL DEFAULT true,
    "offlineSyncInterval" INTEGER NOT NULL DEFAULT 30,
    "offlineQueueLimit" INTEGER NOT NULL DEFAULT 500,
    "rollSoundUrl" TEXT,
    "tensionSoundUrl" TEXT,
    "winSoundUrl" TEXT,
    "grandWinSoundUrl" TEXT,
    "enableTournament" BOOLEAN NOT NULL DEFAULT false,
    "enablePublicRegistration" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "queueNumber" INTEGER NOT NULL,
    "guestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "tableLocation" TEXT NOT NULL,
    "company" TEXT,
    "department" TEXT,
    "division" TEXT,
    "notes" TEXT,
    "category" "GuestCategory" NOT NULL DEFAULT 'REGULAR',
    "registrationSource" "RegistrationSource" NOT NULL DEFAULT 'MANUAL',
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "checkedInByName" TEXT,
    "checkinCount" INTEGER NOT NULL DEFAULT 0,
    "souvenirTaken" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestCheckin" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkinById" TEXT,
    "checkinByName" TEXT,
    "counterName" TEXT,
    "stationId" TEXT,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "clientTimestamp" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GuestCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckinStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckinStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL DEFAULT 'HIBURAN',
    "allowMultipleWins" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeWinner" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "wonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "EmailSettings" (
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

-- CreateTable
CREATE TABLE "EmailLog" (
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

-- CreateTable
CREATE TABLE "LandingPageConfig" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "heroHeadline" TEXT NOT NULL DEFAULT 'Enterprise event management, without the noise.',
    "heroSubtext" TEXT NOT NULL DEFAULT 'Check-in, display, and analytics in one system. Built for operations teams.',
    "heroCtaPrimary" TEXT NOT NULL DEFAULT 'Open Display',
    "heroCtaSecondary" TEXT NOT NULL DEFAULT 'Admin Login',
    "showHero" BOOLEAN NOT NULL DEFAULT true,
    "showFeatures" BOOLEAN NOT NULL DEFAULT true,
    "showGallery" BOOLEAN NOT NULL DEFAULT true,
    "showFooter" BOOLEAN NOT NULL DEFAULT true,
    "featureSectionTitle" TEXT NOT NULL DEFAULT 'Why Attend?',
    "featureSectionSubtext" TEXT NOT NULL DEFAULT 'Discover what makes this event special',
    "galleryTitle" TEXT NOT NULL DEFAULT 'Past Events',
    "gallerySubtext" TEXT NOT NULL DEFAULT 'Moments from events we have powered.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageHeroImage" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "intervalMs" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageHeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageFeature" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageFeatureImage" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "intervalMs" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageFeatureImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageGalleryImage" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sportType" "SportType" NOT NULL,
    "formatType" "TournamentFormat" NOT NULL,
    "participantType" "ParticipantType" NOT NULL,
    "scoringMode" "ScoringMode" NOT NULL DEFAULT 'SIMPLE',
    "scoringConfig" JSONB,
    "schedulingMode" "SchedulingMode" NOT NULL DEFAULT 'MANUAL',
    "courtCount" INTEGER NOT NULL DEFAULT 1,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "eventId" TEXT,
    "enableMatchCheckin" BOOLEAN NOT NULL DEFAULT false,
    "checkinWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "checkinCloseMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "logoUrl" TEXT,
    "seed" INTEGER,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "photoUrl" TEXT,
    "jerseyNumber" VARCHAR(10),
    "guestId" TEXT,
    "role" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundId" TEXT,
    "matchNumber" INTEGER NOT NULL,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "setsA" INTEGER,
    "setsB" INTEGER,
    "winnerId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "court" VARCHAR(50),
    "nextMatchId" TEXT,
    "nextMatchSlot" VARCHAR(1),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "scoreA" INTEGER NOT NULL,
    "scoreB" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentBracket" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'WINNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketRound" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "name" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCheckin" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "guestId" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedById" TEXT,
    "checkedByName" TEXT,
    "counterName" TEXT,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "clientTimestamp" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicRegistrationConfig" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "maxQuota" INTEGER NOT NULL DEFAULT 0,
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "title" TEXT NOT NULL DEFAULT 'Registrasi Peserta',
    "description" TEXT,
    "successMessage" TEXT NOT NULL DEFAULT 'Terima kasih, registrasi Anda berhasil!',
    "closedMessage" TEXT NOT NULL DEFAULT 'Pendaftaran telah ditutup.',
    "fullMessage" TEXT NOT NULL DEFAULT 'Kuota pendaftaran telah penuh.',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "preventDuplicates" BOOLEAN NOT NULL DEFAULT false,
    "guestIdPrefix" TEXT NOT NULL DEFAULT 'PUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRegistrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "Guest_eventId_idx" ON "Guest"("eventId");

-- CreateIndex
CREATE INDEX "Guest_eventId_checkedIn_idx" ON "Guest"("eventId", "checkedIn");

-- CreateIndex
CREATE INDEX "Guest_eventId_guestId_idx" ON "Guest"("eventId", "guestId");

-- CreateIndex
CREATE INDEX "Guest_eventId_category_idx" ON "Guest"("eventId", "category");

-- CreateIndex
CREATE INDEX "Guest_name_idx" ON "Guest"("name");

-- CreateIndex
CREATE INDEX "Guest_company_idx" ON "Guest"("company");

-- CreateIndex
CREATE INDEX "Guest_queueNumber_idx" ON "Guest"("queueNumber");

-- CreateIndex
CREATE INDEX "GuestCheckin_guestId_idx" ON "GuestCheckin"("guestId");

-- CreateIndex
CREATE INDEX "GuestCheckin_checkinById_idx" ON "GuestCheckin"("checkinById");

-- CreateIndex
CREATE INDEX "GuestCheckin_stationId_idx" ON "GuestCheckin"("stationId");

-- CreateIndex
CREATE INDEX "GuestCheckin_isOffline_idx" ON "GuestCheckin"("isOffline");

-- CreateIndex
CREATE INDEX "GuestCheckin_syncedAt_idx" ON "GuestCheckin"("syncedAt");

-- CreateIndex
CREATE INDEX "GuestCheckin_checkinAt_stationId_idx" ON "GuestCheckin"("checkinAt", "stationId");

-- CreateIndex
CREATE INDEX "GuestCheckin_guestId_checkinAt_idx" ON "GuestCheckin"("guestId", "checkinAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckinStation_stationId_key" ON "CheckinStation"("stationId");

-- CreateIndex
CREATE INDEX "CheckinStation_eventId_idx" ON "CheckinStation"("eventId");

-- CreateIndex
CREATE INDEX "CheckinStation_stationId_idx" ON "CheckinStation"("stationId");

-- CreateIndex
CREATE INDEX "Prize_eventId_idx" ON "Prize"("eventId");

-- CreateIndex
CREATE INDEX "PrizeWinner_guestId_idx" ON "PrizeWinner"("guestId");

-- CreateIndex
CREATE INDEX "PrizeWinner_prizeId_idx" ON "PrizeWinner"("prizeId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeWinner_guestId_prizeId_key" ON "PrizeWinner"("guestId", "prizeId");

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
CREATE INDEX "EmailLog_guestId_idx" ON "EmailLog"("guestId");

-- CreateIndex
CREATE INDEX "EmailLog_eventId_idx" ON "EmailLog"("eventId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageConfig_eventId_key" ON "LandingPageConfig"("eventId");

-- CreateIndex
CREATE INDEX "LandingPageHeroImage_configId_sortOrder_idx" ON "LandingPageHeroImage"("configId", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingPageFeature_configId_sortOrder_idx" ON "LandingPageFeature"("configId", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingPageFeatureImage_featureId_sortOrder_idx" ON "LandingPageFeatureImage"("featureId", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingPageGalleryImage_configId_sortOrder_idx" ON "LandingPageGalleryImage"("configId", "sortOrder");

-- CreateIndex
CREATE INDEX "Tournament_eventId_idx" ON "Tournament"("eventId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_idx" ON "TournamentTeam"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_seed_idx" ON "TournamentTeam"("tournamentId", "seed");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_guestId_idx" ON "TeamMember"("guestId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_status_idx" ON "Match"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");

-- CreateIndex
CREATE INDEX "Match_nextMatchId_idx" ON "Match"("nextMatchId");

-- CreateIndex
CREATE INDEX "MatchSet_matchId_idx" ON "MatchSet"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");

-- CreateIndex
CREATE INDEX "MatchParticipant_matchId_idx" ON "MatchParticipant"("matchId");

-- CreateIndex
CREATE INDEX "MatchParticipant_teamId_idx" ON "MatchParticipant"("teamId");

-- CreateIndex
CREATE INDEX "MatchParticipant_memberId_idx" ON "MatchParticipant"("memberId");

-- CreateIndex
CREATE INDEX "TournamentBracket_tournamentId_idx" ON "TournamentBracket"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentBracket_tournamentId_type_key" ON "TournamentBracket"("tournamentId", "type");

-- CreateIndex
CREATE INDEX "BracketRound_bracketId_idx" ON "BracketRound"("bracketId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketRound_bracketId_roundNumber_key" ON "BracketRound"("bracketId", "roundNumber");

-- CreateIndex
CREATE INDEX "TournamentCheckin_matchId_idx" ON "TournamentCheckin"("matchId");

-- CreateIndex
CREATE INDEX "TournamentCheckin_tournamentId_idx" ON "TournamentCheckin"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentCheckin_teamId_idx" ON "TournamentCheckin"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCheckin_memberId_matchId_key" ON "TournamentCheckin"("memberId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicRegistrationConfig_eventId_key" ON "PublicRegistrationConfig"("eventId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCheckin" ADD CONSTRAINT "GuestCheckin_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCheckin" ADD CONSTRAINT "GuestCheckin_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "CheckinStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinStation" ADD CONSTRAINT "CheckinStation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeWinner" ADD CONSTRAINT "PrizeWinner_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeWinner" ADD CONSTRAINT "PrizeWinner_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Souvenir" ADD CONSTRAINT "Souvenir_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirTake" ADD CONSTRAINT "SouvenirTake_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirTake" ADD CONSTRAINT "SouvenirTake_souvenirId_fkey" FOREIGN KEY ("souvenirId") REFERENCES "Souvenir"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeCollection" ADD CONSTRAINT "PrizeCollection_prizeWinnerId_fkey" FOREIGN KEY ("prizeWinnerId") REFERENCES "PrizeWinner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageConfig" ADD CONSTRAINT "LandingPageConfig_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageHeroImage" ADD CONSTRAINT "LandingPageHeroImage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LandingPageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageFeature" ADD CONSTRAINT "LandingPageFeature_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LandingPageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageFeatureImage" ADD CONSTRAINT "LandingPageFeatureImage_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "LandingPageFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageGalleryImage" ADD CONSTRAINT "LandingPageGalleryImage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LandingPageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "BracketRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentBracket" ADD CONSTRAINT "TournamentBracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketRound" ADD CONSTRAINT "BracketRound_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "TournamentBracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCheckin" ADD CONSTRAINT "TournamentCheckin_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCheckin" ADD CONSTRAINT "TournamentCheckin_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicRegistrationConfig" ADD CONSTRAINT "PublicRegistrationConfig_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
