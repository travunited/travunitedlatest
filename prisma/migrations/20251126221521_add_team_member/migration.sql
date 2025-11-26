-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "slug" TEXT,
    "bio" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photoKey" TEXT,
    "photoUrl" TEXT,
    "resumeKey" TEXT,
    "resumeUrl" TEXT,
    "socialLinks" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_slug_key" ON "TeamMember"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_email_key" ON "TeamMember"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamMember_isActive_isFeatured_idx" ON "TeamMember"("isActive", "isFeatured");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TeamMember_sortOrder_idx" ON "TeamMember"("sortOrder");

