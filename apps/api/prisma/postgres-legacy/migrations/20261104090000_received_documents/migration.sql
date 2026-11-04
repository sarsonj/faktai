-- CreateEnum
CREATE TYPE "ReceivedVatRegime" AS ENUM ('domestic_standard', 'domestic_reverse_charge', 'eu_goods', 'eu_service', 'no_deduction');

-- CreateTable
CREATE TABLE "ReceivedDocument" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "documentNumber" VARCHAR(60) NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierIco" VARCHAR(8),
    "supplierVatId" VARCHAR(20),
    "supplierStreet" TEXT,
    "supplierCity" TEXT,
    "supplierPostalCode" TEXT,
    "supplierCountryCode" VARCHAR(2) NOT NULL DEFAULT 'CZ',
    "description" TEXT,
    "issueDate" TIMESTAMP(3),
    "taxableSupplyDate" TIMESTAMP(3) NOT NULL,
    "deductionDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "vatRegime" "ReceivedVatRegime" NOT NULL,
    "reverseChargeCode" VARCHAR(4),
    "totalWithoutVat" DECIMAL(15,2) NOT NULL,
    "totalVat" DECIMAL(15,2) NOT NULL,
    "totalPayable" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivedDocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "base" DECIMAL(15,2) NOT NULL,
    "vat" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "ReceivedDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivedDocumentAttachment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivedDocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceivedDocument_subjectId_taxableSupplyDate_idx" ON "ReceivedDocument"("subjectId", "taxableSupplyDate");

-- CreateIndex
CREATE INDEX "ReceivedDocument_subjectId_deductionDate_idx" ON "ReceivedDocument"("subjectId", "deductionDate");

-- CreateIndex
CREATE INDEX "ReceivedDocumentLine_documentId_position_idx" ON "ReceivedDocumentLine"("documentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedDocumentAttachment_storageKey_key" ON "ReceivedDocumentAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "ReceivedDocumentAttachment_documentId_idx" ON "ReceivedDocumentAttachment"("documentId");

-- AddForeignKey
ALTER TABLE "ReceivedDocument" ADD CONSTRAINT "ReceivedDocument_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedDocumentLine" ADD CONSTRAINT "ReceivedDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ReceivedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedDocumentAttachment" ADD CONSTRAINT "ReceivedDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ReceivedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

