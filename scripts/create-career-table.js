// Script to create the Career table in the database
// Run with: node scripts/create-career-table.js

const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('Creating Career table...');

        // Execute raw SQL to create the table
        await prisma.$executeRaw`
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
    `;

        console.log('✓ Career table created');

        // Create indexes
        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Career_isActive_idx" ON "Career"("isActive");
    `;
        console.log('✓ Created isActive index');

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Career_sortOrder_idx" ON "Career"("sortOrder");
    `;
        console.log('✓ Created sortOrder index');

        console.log('\n✅ Career table created successfully!');
        console.log('\nNext step: Run "npx prisma generate" to update Prisma client');

    } catch (error) {
        console.error('Error creating Career table:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
