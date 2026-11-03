import {
  ReceivedDocument,
  ReceivedDocumentAttachment,
  ReceivedDocumentLine,
  ReceivedVatRegime,
} from '@prisma/client';

export type ReceivedDocumentAttachmentView = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export type ReceivedDocumentView = {
  id: string;
  documentNumber: string;
  supplierName: string;
  supplierIco: string | null;
  supplierVatId: string | null;
  supplierStreet: string | null;
  supplierCity: string | null;
  supplierPostalCode: string | null;
  supplierCountryCode: string;
  description: string | null;
  issueDate: string | null;
  taxableSupplyDate: string;
  deductionDate: string;
  dueDate: string | null;
  paidAt: string | null;
  vatRegime: ReceivedVatRegime;
  reverseChargeCode: string | null;
  totalWithoutVat: string;
  totalVat: string;
  totalPayable: string;
  note: string | null;
  lines: Array<{ vatRate: number; base: string; vat: string }>;
  attachments: ReceivedDocumentAttachmentView[];
  createdAt: string;
  updatedAt: string;
};

const iso = (value: Date | null) => value?.toISOString() ?? null;

export function mapAttachment(
  attachment: ReceivedDocumentAttachment,
): ReceivedDocumentAttachmentView {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function mapReceivedDocument(
  row: ReceivedDocument & {
    lines: ReceivedDocumentLine[];
    attachments: ReceivedDocumentAttachment[];
  },
): ReceivedDocumentView {
  return {
    id: row.id,
    documentNumber: row.documentNumber,
    supplierName: row.supplierName,
    supplierIco: row.supplierIco,
    supplierVatId: row.supplierVatId,
    supplierStreet: row.supplierStreet,
    supplierCity: row.supplierCity,
    supplierPostalCode: row.supplierPostalCode,
    supplierCountryCode: row.supplierCountryCode,
    description: row.description,
    issueDate: iso(row.issueDate),
    taxableSupplyDate: row.taxableSupplyDate.toISOString(),
    deductionDate: row.deductionDate.toISOString(),
    dueDate: iso(row.dueDate),
    paidAt: iso(row.paidAt),
    vatRegime: row.vatRegime,
    reverseChargeCode: row.reverseChargeCode,
    totalWithoutVat: row.totalWithoutVat.toFixed(2),
    totalVat: row.totalVat.toFixed(2),
    totalPayable: row.totalPayable.toFixed(2),
    note: row.note,
    lines: [...row.lines]
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        vatRate: line.vatRate,
        base: line.base.toFixed(2),
        vat: line.vat.toFixed(2),
      })),
    attachments: [...row.attachments]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapAttachment),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
