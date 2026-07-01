-- Country URLs use a single canonical slug across every locale now; the
-- per-locale slug columns and their unique indexes are no longer read anywhere.
DROP INDEX IF EXISTS "Country_slugEs_key";
DROP INDEX IF EXISTS "Country_slugEn_key";
DROP INDEX IF EXISTS "Country_slugPt_key";
DROP INDEX IF EXISTS "Country_slugFr_key";
DROP INDEX IF EXISTS "Country_slugDe_key";

ALTER TABLE "Country" DROP COLUMN IF EXISTS "slugEs";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "slugEn";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "slugPt";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "slugFr";
ALTER TABLE "Country" DROP COLUMN IF EXISTS "slugDe";
