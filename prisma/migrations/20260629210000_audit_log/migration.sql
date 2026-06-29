CREATE TABLE "AuditLog" (
  "id"          TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userEmail"   TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "entityType"  TEXT NOT NULL,
  "entityId"    TEXT,
  "entityName"  TEXT,
  "countrySlug" TEXT,
  "detail"      TEXT,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);
CREATE INDEX "AuditLog_countrySlug_idx" ON "AuditLog"("countrySlug");
CREATE INDEX "AuditLog_userEmail_idx" ON "AuditLog"("userEmail");
