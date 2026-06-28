-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "Resource_countrySlug_idx" ON "Resource"("countrySlug");

-- CreateIndex
CREATE INDEX "MagicToken_email_idx" ON "MagicToken"("email");

-- CreateIndex
CREATE INDEX "CommunityReport_resolved_countrySlug_idx" ON "CommunityReport"("resolved", "countrySlug");
