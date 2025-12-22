// Script to resolve failed migration in production
// Usage: DATABASE_URL="your_production_url" node resolve-prod-migration.js

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Use production database URL from environment or command line
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.includes('travunited_prod')) {
  console.error('⚠️  Warning: This script should be run with production DATABASE_URL');
  console.error('   Current DATABASE_URL points to:', databaseUrl?.replace(/:[^:@]+@/, ':****@') || 'not set');
  console.error('\nUsage:');
  console.error('  DATABASE_URL="postgresql://user:pass@host:5432/travunited_prod" node resolve-prod-migration.js');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function checkAndResolve() {
  try {
    console.log('Checking migration status...\n');
    
    // Check if the column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Visa' 
      AND column_name = 'sampleVisaImageUrl';
    `;
    
    if (result && result.length > 0) {
      console.log('✅ Column "sampleVisaImageUrl" already exists in "Visa" table');
      console.log('\nThe migration should be marked as applied.');
      console.log('Run: npx prisma migrate resolve --applied 20251222000007_add_sample_visa_image');
      console.log('\n(With production DATABASE_URL set)');
    } else {
      console.log('❌ Column "sampleVisaImageUrl" does NOT exist in "Visa" table');
      console.log('\nThe migration should be marked as rolled back so it can be retried.');
      console.log('Run: npx prisma migrate resolve --rolled-back 20251222000007_add_sample_visa_image');
      console.log('Then: npx prisma migrate deploy');
      console.log('\n(With production DATABASE_URL set)');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndResolve();
