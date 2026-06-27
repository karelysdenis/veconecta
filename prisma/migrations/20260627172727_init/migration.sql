-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('FIND_FAMILY', 'DONATE_MONEY', 'SEND_MONEY', 'CALL_FREE', 'DONATE_PHYSICALLY', 'DIGITAL_BRIDGE', 'CONSULAR', 'MENTAL_HEALTH');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "countrySlug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "namePt" TEXT,
    "flag" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "countrySlug" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "phone" TEXT,
    "bizum" TEXT,
    "free" BOOLEAN NOT NULL DEFAULT false,
    "notesEs" TEXT,
    "notesEn" TEXT,
    "notesPt" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT,
    "countrySlug" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "url" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MagicToken_token_key" ON "MagicToken"("token");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_countrySlug_fkey" FOREIGN KEY ("countrySlug") REFERENCES "Country"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
