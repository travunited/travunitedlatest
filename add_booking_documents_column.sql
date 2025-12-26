-- Add documents column to Booking table if it doesn't exist
-- Run this SQL directly in your PostgreSQL database

DO $$ 
BEGIN
    -- Check if Booking table exists first
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Booking'
    ) THEN
        -- Add documents JSONB column to Booking if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'Booking' 
            AND column_name = 'documents'
        ) THEN
            ALTER TABLE "Booking" ADD COLUMN "documents" JSONB;
            RAISE NOTICE '✅ Successfully added documents column to Booking table';
        ELSE
            RAISE NOTICE 'ℹ️  documents column already exists in Booking table';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Booking table does not exist, skipping documents column addition';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Booking' 
AND column_name = 'documents';

