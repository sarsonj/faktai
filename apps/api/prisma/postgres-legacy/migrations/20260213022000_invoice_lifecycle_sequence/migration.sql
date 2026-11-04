-- CreateEnum
CREATE TYPE "TaxClassification" AS ENUM (
  'domestic_standard',
  'domestic_reverse_charge',
  'eu_service',
  'eu_goods',
  'export_third_country',
  'exempt_without_credit'
);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "taxClassification" "TaxClassification";

-- CreateTable
CREATE TABLE "InvoiceNumberSequence" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceNumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceNumberSequence_subjectId_periodYear_key" ON "InvoiceNumberSequence"("subjectId", "periodYear");

-- CreateIndex
CREATE INDEX "Invoice_subjectId_taxableSupplyDate_idx" ON "Invoice"("subjectId", "taxableSupplyDate");

-- AddForeignKey
ALTER TABLE "InvoiceNumberSequence" ADD CONSTRAINT "InvoiceNumberSequence_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dueDate_gte_issueDate" CHECK ("dueDate" >= "issueDate");

-- AddCheckConstraint
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_vatRate_allowed" CHECK ("vatRate" IN (0, 12, 21));
