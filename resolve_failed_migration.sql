-- Script to resolve failed migration in Prisma
-- This marks the failed migration as rolled back so it can be retried

-- First, let's check the current state
SELECT migration_name, finished_at, applied_steps_count, logs 
FROM "_prisma_migrations" 
WHERE migration_name = '20251224000000_fix_documents_and_promocode_relations'
ORDER BY started_at DESC 
LIMIT 1;

-- Mark the failed migration as rolled back
-- This allows Prisma to retry the migration
UPDATE "_prisma_migrations"
SET 
    finished_at = NULL,
    applied_steps_count = 0,
    logs = NULL,
    rolled_back_at = NOW()
WHERE migration_name = '20251224000000_fix_documents_and_promocode_relations'
  AND finished_at IS NULL;

-- Verify the update
SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
FROM "_prisma_migrations" 
WHERE migration_name = '20251224000000_fix_documents_and_promocode_relations'
ORDER BY started_at DESC 
LIMIT 1;

