-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "enabledLocales" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Locale" (
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Locale_pkey" PRIMARY KEY ("code")
);

-- Seed: es/en/pt/de are live today, fr stays off (disabled since the
-- 2026-07-01 slug incident, never reintroduced) until an admin flips it on
-- from /admin/languages.
INSERT INTO "Locale" ("code", "active", "order") VALUES
  ('es', true, 0),
  ('en', true, 1),
  ('pt', true, 2),
  ('fr', false, 3),
  ('de', true, 4);
