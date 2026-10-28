-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "checkedInById" TEXT,
ADD COLUMN     "checkedInByName" TEXT;

-- CreateIndex
CREATE INDEX "Guest_company_idx" ON "Guest"("company");
