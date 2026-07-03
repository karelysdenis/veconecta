CREATE TYPE "ResourceKind" AS ENUM ('PERMANENT', 'EVENT');

ALTER TABLE "Resource" ADD COLUMN "kind" "ResourceKind" NOT NULL DEFAULT 'PERMANENT';
ALTER TABLE "Resource" ADD COLUMN "eventStartsAt" TIMESTAMP(3);
ALTER TABLE "Resource" ADD COLUMN "eventEndsAt" TIMESTAMP(3);

CREATE INDEX "Resource_kind_idx" ON "Resource"("kind");
