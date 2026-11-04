-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "businessName" TEXT,
    "ico" TEXT NOT NULL,
    "dic" TEXT,
    "isVatPayer" BOOLEAN NOT NULL,
    "vatPeriodType" TEXT NOT NULL DEFAULT 'quarter',
    "vatRegistrationDate" DATETIME,
    "taxOfficePracufo" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'CZ',
    "bankAccountPrefix" TEXT,
    "bankAccountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "defaultVariableSymbolType" TEXT NOT NULL,
    "defaultVariableSymbolValue" TEXT,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "invoiceNumber" TEXT,
    "variableSymbol" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "taxableSupplyDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "taxClassification" TEXT,
    "reverseChargeCode" TEXT,
    "customerName" TEXT NOT NULL,
    "customerIco" TEXT,
    "customerDic" TEXT,
    "customerStreet" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL,
    "customerPostalCode" TEXT NOT NULL,
    "customerCountryCode" TEXT NOT NULL DEFAULT 'CZ',
    "supplierSnapshot" JSONB,
    "note" TEXT,
    "totalWithoutVat" DECIMAL NOT NULL,
    "totalVat" DECIMAL NOT NULL,
    "totalWithVat" DECIMAL NOT NULL,
    "pdfVersion" INTEGER NOT NULL DEFAULT 0,
    "pdfPayloadHash" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "lineTotalWithoutVat" DECIMAL NOT NULL,
    "lineVatAmount" DECIMAL NOT NULL,
    "lineTotalWithVat" DECIMAL NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceNumberSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceNumberSequence_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PdfExportMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "exportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedByUserId" TEXT NOT NULL,
    "pdfVersion" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    CONSTRAINT "PdfExportMetadata_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PdfExportMetadata_exportedByUserId_fkey" FOREIGN KEY ("exportedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxReportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodValue" INTEGER NOT NULL,
    "runVersion" INTEGER NOT NULL,
    "datasetHash" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxReportRun_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaxReportRun_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxReportRunEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceUpdatedAtSnapshot" DATETIME NOT NULL,
    CONSTRAINT "TaxReportRunEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TaxReportRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaxReportRunEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierIco" TEXT,
    "supplierVatId" TEXT,
    "supplierStreet" TEXT,
    "supplierCity" TEXT,
    "supplierPostalCode" TEXT,
    "supplierCountryCode" TEXT NOT NULL DEFAULT 'CZ',
    "description" TEXT,
    "issueDate" DATETIME,
    "taxableSupplyDate" DATETIME NOT NULL,
    "deductionDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "paidAt" DATETIME,
    "vatRegime" TEXT NOT NULL,
    "reverseChargeCode" TEXT,
    "totalWithoutVat" DECIMAL NOT NULL,
    "totalVat" DECIMAL NOT NULL,
    "totalPayable" DECIMAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReceivedDocument_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivedDocumentLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "base" DECIMAL NOT NULL,
    "vat" DECIMAL NOT NULL,
    CONSTRAINT "ReceivedDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ReceivedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivedDocumentAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceivedDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ReceivedDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionTokenHash_key" ON "UserSession"("sessionTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_userId_key" ON "Subject"("userId");

-- CreateIndex
CREATE INDEX "Invoice_subjectId_issueDate_idx" ON "Invoice"("subjectId", "issueDate" DESC);

-- CreateIndex
CREATE INDEX "Invoice_subjectId_dueDate_idx" ON "Invoice"("subjectId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_subjectId_status_idx" ON "Invoice"("subjectId", "status");

-- CreateIndex
CREATE INDEX "Invoice_subjectId_taxableSupplyDate_idx" ON "Invoice"("subjectId", "taxableSupplyDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_subjectId_invoiceNumber_key" ON "Invoice"("subjectId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_position_idx" ON "InvoiceItem"("invoiceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceNumberSequence_subjectId_periodYear_key" ON "InvoiceNumberSequence"("subjectId", "periodYear");

-- CreateIndex
CREATE INDEX "PdfExportMetadata_invoiceId_exportedAt_idx" ON "PdfExportMetadata"("invoiceId", "exportedAt");

-- CreateIndex
CREATE INDEX "TaxReportRun_subjectId_reportType_periodType_periodYear_periodValue_generatedAt_idx" ON "TaxReportRun"("subjectId", "reportType", "periodType", "periodYear", "periodValue", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "TaxReportRunEntry_runId_invoiceId_idx" ON "TaxReportRunEntry"("runId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_userId_key" ON "ApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_userId_key_key" ON "IdempotencyRecord"("userId", "key");

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

