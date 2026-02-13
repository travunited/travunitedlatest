-- Add missing User fields for registration
-- Check if columns exist before adding them

DO $$ 
BEGIN
    -- Add registrationOtp column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'registrationOtp'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "registrationOtp" TEXT;
    END IF;
    
    -- Add registrationOtpExpires column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'registrationOtpExpires'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "registrationOtpExpires" TIMESTAMP(3);
    END IF;
END $$;

