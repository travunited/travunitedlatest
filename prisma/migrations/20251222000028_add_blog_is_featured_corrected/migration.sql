-- AlterTable
-- Add column only if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'BlogPost' 
        AND column_name = 'isFeatured'
    ) THEN
        ALTER TABLE "BlogPost" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

