-- Update super admin email from super@travunited.com to travunited3@gmail.com
-- This migration updates the existing super admin user's email address

UPDATE "User"
SET email = 'travunited3@gmail.com'
WHERE email = 'super@travunited.com' AND role = 'SUPER_ADMIN';

-- If the new email already exists with a different role, we need to handle it
-- This is a safety check - if travunited3@gmail.com exists but is not SUPER_ADMIN,
-- we should not update to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User" 
    WHERE email = 'travunited3@gmail.com' 
    AND role != 'SUPER_ADMIN'
  ) THEN
    RAISE NOTICE 'Warning: travunited3@gmail.com already exists with a different role. Manual intervention may be required.';
  END IF;
END $$;

