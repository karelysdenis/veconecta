-- DropIndex
DROP INDEX "Resource_city_idx";

-- AlterTable: drop legacy city text column (replaced by cityId FK to City model)
ALTER TABLE "Resource" DROP COLUMN "city";
