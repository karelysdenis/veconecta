-- AlterTable: add city, address, schedule to Resource
ALTER TABLE "Resource" ADD COLUMN "city" TEXT;
ALTER TABLE "Resource" ADD COLUMN "address" TEXT;
ALTER TABLE "Resource" ADD COLUMN "schedule" TEXT;

-- CreateIndex
CREATE INDEX "Resource_city_idx" ON "Resource"("city");
