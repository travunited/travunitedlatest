-- Create PasswordReset table if it doesn't exist
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX IF NOT EXISTS "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
CREATE INDEX IF NOT EXISTS "PasswordReset_used_idx" ON "PasswordReset"("used");
CREATE INDEX IF NOT EXISTS "PasswordReset_otp_idx" ON "PasswordReset"("otp");
CREATE INDEX IF NOT EXISTS "PasswordReset_otpExpiresAt_idx" ON "PasswordReset"("otpExpiresAt");

-- Add OTP columns if table exists but columns don't
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PasswordReset') THEN
        -- Add OTP column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PasswordReset' AND column_name = 'otp') THEN
            ALTER TABLE "PasswordReset" ADD COLUMN "otp" TEXT;
        END IF;
        
        -- Add OTP expiration column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PasswordReset' AND column_name = 'otpExpiresAt') THEN
            ALTER TABLE "PasswordReset" ADD COLUMN "otpExpiresAt" TIMESTAMP(3);
        END IF;
    END IF;
END $$;

-- Add foreign key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PasswordReset_userId_fkey'
    ) THEN
        ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

