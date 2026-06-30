-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "cityId" TEXT;

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countrySlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT,
    "namePt" TEXT,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_countrySlug_idx" ON "City"("countrySlug");

-- CreateIndex
CREATE UNIQUE INDEX "City_countrySlug_slug_key" ON "City"("countrySlug", "slug");

-- CreateIndex
CREATE INDEX "Resource_cityId_idx" ON "Resource"("cityId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countrySlug_fkey" FOREIGN KEY ("countrySlug") REFERENCES "Country"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
