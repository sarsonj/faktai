-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "invoiceNumber" TEXT,
    "variableSymbol" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "taxableSupplyDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'bank_transfer',
    "customerName" TEXT NOT NULL,
    "customerIco" TEXT,
    "customerDic" TEXT,
    "customerStreet" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL,
    "customerPostalCode" TEXT NOT NULL,
    "customerCountryCode" VARCHAR(2) NOT NULL DEFAULT 'CZ',
    "supplierSnapshot" JSONB,
    "note" TEXT,
    "totalWithoutVat" DECIMAL(15,2) NOT NULL,
    "totalVat" DECIMAL(15,2) NOT NULL,
    "totalWithVat" DECIMAL(15,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "lineTotalWithoutVat" DECIMAL(15,2) NOT NULL,
    "lineVatAmount" DECIMAL(15,2) NOT NULL,
    "lineTotalWithVat" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_subjectId_invoiceNumber_key" ON "Invoice"("subjectId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_subjectId_issueDate_idx" ON "Invoice"("subjectId", "issueDate" DESC);

-- CreateIndex
CREATE INDEX "Invoice_subjectId_dueDate_idx" ON "Invoice"("subjectId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_subjectId_status_idx" ON "Invoice"("subjectId", "status");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_position_idx" ON "InvoiceItem"("invoiceId", "position");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
