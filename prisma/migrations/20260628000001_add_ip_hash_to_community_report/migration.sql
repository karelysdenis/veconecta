-- AlterTable
ALTER TABLE "CommunityReport" ADD COLUMN "ipHash" TEXT;

-- CreateIndex
CREATE INDEX "CommunityReport_ipHash_createdAt_idx" ON "CommunityReport"("ipHash", "createdAt");
