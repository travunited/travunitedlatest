-- Add OTP field to PasswordReset table
ALTER TABLE "PasswordReset" ADD COLUMN IF NOT EXISTS "otp" TEXT;
ALTER TABLE "PasswordReset" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);

-- Add index for OTP lookups
CREATE INDEX IF NOT EXISTS "PasswordReset_otp_idx" ON "PasswordReset"("otp");
CREATE INDEX IF NOT EXISTS "PasswordReset_otpExpiresAt_idx" ON "PasswordReset"("otpExpiresAt");

