-- CreateEnum
CREATE TYPE "TaxReportType" AS ENUM ('vat_return', 'summary_statement', 'control_statement');

-- CreateEnum
CREATE TYPE "TaxPeriodType" AS ENUM ('month', 'quarter');

-- CreateTable
CREATE TABLE "TaxReportRun" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "reportType" "TaxReportType" NOT NULL,
    "periodType" "TaxPeriodType" NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodValue" INTEGER NOT NULL,
    "runVersion" INTEGER NOT NULL,
    "datasetHash" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReportRunEntry" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceUpdatedAtSnapshot" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReportRunEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxReportRun_subjectId_reportType_periodType_periodYear_periodVal_idx" ON "TaxReportRun"("subjectId", "reportType", "periodType", "periodYear", "periodValue", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "TaxReportRunEntry_runId_invoiceId_idx" ON "TaxReportRunEntry"("runId", "invoiceId");

-- AddForeignKey
ALTER TABLE "TaxReportRun" ADD CONSTRAINT "TaxReportRun_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReportRun" ADD CONSTRAINT "TaxReportRun_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReportRunEntry" ADD CONSTRAINT "TaxReportRunEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaxReportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReportRunEntry" ADD CONSTRAINT "TaxReportRunEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
