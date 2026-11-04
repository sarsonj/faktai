-- AlterTable
ALTER TABLE "Invoice"
ADD COLUMN "pdfVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pdfPayloadHash" TEXT;

-- CreateTable
CREATE TABLE "PdfExportMetadata" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedByUserId" TEXT NOT NULL,
    "pdfVersion" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "PdfExportMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdfExportMetadata_invoiceId_exportedAt_idx" ON "PdfExportMetadata"("invoiceId", "exportedAt");

-- AddForeignKey
ALTER TABLE "PdfExportMetadata" ADD CONSTRAINT "PdfExportMetadata_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfExportMetadata" ADD CONSTRAINT "PdfExportMetadata_exportedByUserId_fkey" FOREIGN KEY ("exportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
