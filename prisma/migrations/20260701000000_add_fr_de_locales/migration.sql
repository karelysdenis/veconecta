-- AlterTable
ALTER TABLE "City" ADD COLUMN     "nameDe" TEXT,
ADD COLUMN     "nameFr" TEXT;

-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "nameDe" TEXT,
ADD COLUMN     "nameFr" TEXT,
ADD COLUMN     "slugDe" TEXT,
ADD COLUMN     "slugFr" TEXT;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "nameDe" TEXT,
ADD COLUMN     "nameFr" TEXT,
ADD COLUMN     "notesDe" TEXT,
ADD COLUMN     "notesFr" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Country_slugFr_key" ON "Country"("slugFr");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slugDe_key" ON "Country"("slugDe");

