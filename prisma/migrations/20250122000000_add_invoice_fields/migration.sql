-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "invoiceUploadedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceUploadedByAdminId" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "invoiceUploadedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceUploadedByAdminId" TEXT;

