-- Add E_VISA to VisaMode enum if it doesn't exist
-- Note: ALTER TYPE ADD VALUE cannot be rolled back, but we check if value exists first

DO $$ 
BEGIN
  -- Add E_VISA if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'E_VISA' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VisaMode')
  ) THEN
    ALTER TYPE "VisaMode" ADD VALUE 'E_VISA';
  END IF;
END $$;
