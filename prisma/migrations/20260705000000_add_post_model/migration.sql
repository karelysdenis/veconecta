-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "body" TEXT NOT NULL,
    "bodyEn" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- Seed: first Noticias post, verbatim crisis-facts text supplied by the
-- user (see docs/superpowers/specs/2026-07-05-sobre-noticias-design.md).
-- Not editorial content — do not reword when touching this file later.
INSERT INTO "Post" ("id", "slug", "title", "titleEn", "body", "bodyEn", "status", "publishedAt", "createdAt", "updatedAt")
VALUES (
  'seed-post-sobre-la-crisis',
  'sobre-la-crisis',
  'Sobre la crisis',
  'About the Crisis',
  $body_es$El miércoles 24 de junio, Venezuela fue sacudida por dos poderosos terremotos de magnitudes 7,2 y 7,5 que ocurrieron con apenas segundos de diferencia. Los sismos provocaron daños catastróficos en la costa norte del país, afectando especialmente al estado La Guaira, la ciudad de Caracas y varias zonas del estado Miranda.

Según Reuters, hasta el sábado 4 de julio, la cifra oficial de fallecidos ascendía a 2.954 personas. El gobierno venezolano informó que cerca de 30.000 funcionarios nacionales de emergencia y 3.281 rescatistas internacionales han sido desplegados para apoyar las labores de búsqueda, rescate y recuperación. Más de 16.000 personas han quedado sin hogar, mientras que un registro no oficial, pero ampliamente utilizado por organizaciones y familiares, reporta más de 41.000 personas desaparecidas.

La magnitud de la destrucción ha dejado a miles de familias desplazadas, ha sobrepasado la capacidad de hospitales y servicios de emergencia, ha dañado infraestructura crítica y ha dejado comunidades enteras buscando a sus seres queridos entre los escombros. Aunque las labores de rescate continúan, las necesidades humanitarias se extenderán mucho más allá de la respuesta inmediata. Miles de familias necesitarán refugio, alimentos, atención médica, agua potable, apoyo psicológico y asistencia a largo plazo para reconstruir sus vidas.$body_es$,
  $body_en$On Wednesday, June 24, Venezuela was struck by two powerful earthquakes measuring 7.2 and 7.5 in magnitude just seconds apart. The twin earthquakes caused catastrophic damage across the country's northern coast, particularly in the state of La Guaira, the city of Caracas, and parts of Miranda state.

According to Reuters, as of Saturday, July 4, the official death toll has risen to 2,954. The Venezuelan government says nearly 30,000 national emergency personnel and 3,281 international rescue workers have been deployed to assist with search, rescue, and recovery operations. More than 16,000 people have been left homeless, while an unofficial but widely used registry lists more than 41,000 people as still missing. (Reuters)

The destruction has displaced thousands of families, overwhelmed hospitals and emergency services, damaged critical infrastructure, and left entire communities searching for loved ones beneath the rubble. While rescue operations continue, the humanitarian needs will extend far beyond the initial emergency. Families will require shelter, food, medical care, clean water, mental health support, and long-term assistance to rebuild their lives. (Reuters)$body_en$,
  'PUBLISHED',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
