-- pg_trgm enables GIN indexes that accelerate ILIKE '%term%' substring search,
-- which app/api/search and /buscar rely on across every locale column. Without
-- it, each search does a sequential scan across all these text columns; that's
-- fine at dozens of resources but won't hold up as the catalog grows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Country_nameEs_idx" ON "Country" USING GIN ("nameEs" gin_trgm_ops);
CREATE INDEX "Country_nameEn_idx" ON "Country" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX "Country_namePt_idx" ON "Country" USING GIN ("namePt" gin_trgm_ops);
CREATE INDEX "Country_nameFr_idx" ON "Country" USING GIN ("nameFr" gin_trgm_ops);
CREATE INDEX "Country_nameDe_idx" ON "Country" USING GIN ("nameDe" gin_trgm_ops);

CREATE INDEX "Resource_name_idx" ON "Resource" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Resource_nameEn_idx" ON "Resource" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX "Resource_namePt_idx" ON "Resource" USING GIN ("namePt" gin_trgm_ops);
CREATE INDEX "Resource_nameFr_idx" ON "Resource" USING GIN ("nameFr" gin_trgm_ops);
CREATE INDEX "Resource_nameDe_idx" ON "Resource" USING GIN ("nameDe" gin_trgm_ops);
CREATE INDEX "Resource_notesEs_idx" ON "Resource" USING GIN ("notesEs" gin_trgm_ops);
CREATE INDEX "Resource_notesEn_idx" ON "Resource" USING GIN ("notesEn" gin_trgm_ops);
CREATE INDEX "Resource_notesPt_idx" ON "Resource" USING GIN ("notesPt" gin_trgm_ops);
CREATE INDEX "Resource_notesFr_idx" ON "Resource" USING GIN ("notesFr" gin_trgm_ops);
CREATE INDEX "Resource_notesDe_idx" ON "Resource" USING GIN ("notesDe" gin_trgm_ops);
