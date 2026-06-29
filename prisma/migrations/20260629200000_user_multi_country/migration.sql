-- Add countrySlugs array, migrate existing single countrySlug, drop old column
ALTER TABLE "User" ADD COLUMN "countrySlugs" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "User" SET "countrySlugs" = ARRAY["countrySlug"] WHERE "countrySlug" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "countrySlug";
