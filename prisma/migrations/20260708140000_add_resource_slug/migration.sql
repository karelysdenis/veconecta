-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
