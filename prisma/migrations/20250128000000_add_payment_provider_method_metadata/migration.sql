-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "Payment"."provider" IS 'Payment provider: RAZORPAY, PAYPAL, STRIPE, NONE';
COMMENT ON COLUMN "Payment"."method" IS 'Payment method: CARD, UPI, WALLET, NETBANKING, FREE';
COMMENT ON COLUMN "Payment"."metadata" IS 'Additional payment metadata in JSON format';

