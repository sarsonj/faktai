-- AlterTable
ALTER TABLE "Subject"
ADD COLUMN "vatPeriodType" "TaxPeriodType" NOT NULL DEFAULT 'quarter';
