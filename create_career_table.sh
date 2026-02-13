#!/bin/bash

# Script to create the Career table in the database
# Run this script to create the Career table manually

echo "Creating Career table..."

# Get database connection details from .env
source .env

# Create the Career table
cat << 'EOF' | PGPASSWORD=$DATABASE_PASSWORD psql -h localhost -U deploy -d travunited_prod
-- CreateTable
CREATE TABLE IF NOT EXISTS "Career" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Career_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Career_isActive_idx" ON "Career"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Career_sortOrder_idx" ON "Career"("sortOrder");

SELECT 'Career table created successfully!' as result;
EOF

echo "Done! Now run: npx prisma generate"
