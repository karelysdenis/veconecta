-- Add localized slug columns
ALTER TABLE "Country" ADD COLUMN "slugEs" TEXT;
ALTER TABLE "Country" ADD COLUMN "slugEn" TEXT;
ALTER TABLE "Country" ADD COLUMN "slugPt" TEXT;

-- Populate known countries
UPDATE "Country" SET
  "slugEs" = CASE "slug"
    WHEN 'global'    THEN 'global'
    WHEN 'spain'     THEN 'espana'
    WHEN 'usa'       THEN 'estados-unidos'
    WHEN 'colombia'  THEN 'colombia'
    WHEN 'brazil'    THEN 'brasil'
    WHEN 'argentina' THEN 'argentina'
    WHEN 'peru'      THEN 'peru'
    WHEN 'chile'     THEN 'chile'
    WHEN 'mexico'    THEN 'mexico'
    WHEN 'ecuador'   THEN 'ecuador'
    ELSE lower(regexp_replace("nameEs", '[^a-zA-Z0-9]+', '-', 'g'))
  END,
  "slugEn" = CASE "slug"
    WHEN 'global'    THEN 'global'
    WHEN 'spain'     THEN 'spain'
    WHEN 'usa'       THEN 'united-states'
    WHEN 'colombia'  THEN 'colombia'
    WHEN 'brazil'    THEN 'brazil'
    WHEN 'argentina' THEN 'argentina'
    WHEN 'peru'      THEN 'peru'
    WHEN 'chile'     THEN 'chile'
    WHEN 'mexico'    THEN 'mexico'
    WHEN 'ecuador'   THEN 'ecuador'
    ELSE lower(regexp_replace("nameEn", '[^a-zA-Z0-9]+', '-', 'g'))
  END,
  "slugPt" = CASE "slug"
    WHEN 'global'    THEN 'global'
    WHEN 'spain'     THEN 'espanha'
    WHEN 'usa'       THEN 'estados-unidos'
    WHEN 'colombia'  THEN 'colombia'
    WHEN 'brazil'    THEN 'brasil'
    WHEN 'argentina' THEN 'argentina'
    WHEN 'peru'      THEN 'peru'
    WHEN 'chile'     THEN 'chile'
    WHEN 'mexico'    THEN 'mexico'
    WHEN 'ecuador'   THEN 'equador'
    ELSE lower(regexp_replace(COALESCE("namePt", "nameEs"), '[^a-zA-Z0-9]+', '-', 'g'))
  END;

-- Add unique constraints (PostgreSQL allows multiple NULLs in UNIQUE columns)
CREATE UNIQUE INDEX "Country_slugEs_key" ON "Country"("slugEs");
CREATE UNIQUE INDEX "Country_slugEn_key" ON "Country"("slugEn");
CREATE UNIQUE INDEX "Country_slugPt_key" ON "Country"("slugPt");
