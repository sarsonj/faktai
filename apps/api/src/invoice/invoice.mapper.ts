import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  Subject,
  TaxClassification,
} from '@prisma/client';
import { todayDateOnly } from '../utils/date-only';
import { resolveSupplierSnapshot } from './domain/supplier-snapshot';

// Převod DB záznamů na tvar API odpovědí (seznam a detail faktury).

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalWithoutVat: string;
  totalWithVat: string;
  paidAt: string | null;
  description: string;
};

export type InvoiceListRow = Invoice & {
  items: Array<Pick<InvoiceItem, 'description'>>;
};

export type InvoiceDetailItem = {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
  lineTotalWithoutVat: string;
  lineVatAmount: string;
  lineTotalWithVat: string;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';
  variableSymbol: string;
  issueDate: string;
  taxableSupplyDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  taxClassification: TaxClassification | null;
  reverseChargeCode: string | null;
  customerName: string;
  customerIco: string | null;
  customerDic: string | null;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountryCode: string;
  note: string | null;
  totalWithoutVat: string;
  totalVat: string;
  totalWithVat: string;
  pdfVersion: number;
  paidAt: string | null;
  supplierBankAccountPrefix: string | null;
  supplierBankAccountNumber: string;
  supplierBankCode: string;
  supplierIsVatPayer: boolean;
  items: InvoiceDetailItem[];
};

export function toEffectiveStatus(status: InvoiceStatus, dueDate: Date) {
  const today = todayDateOnly();
  if (status === 'issued' && dueDate < today) {
    return 'overdue' as const;
  }
  return status;
}

export function mapListItem(row: InvoiceListRow): InvoiceListItem {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: toEffectiveStatus(row.status, row.dueDate),
    customerName: row.customerName,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate.toISOString(),
    totalWithoutVat: row.totalWithoutVat.toString(),
    totalWithVat: row.totalWithVat.toString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    description: row.items[0]?.description?.slice(0, 120) ?? '',
  };
}

export function mapDetailItem(item: InvoiceItem): InvoiceDetailItem {
  return {
    id: item.id,
    position: item.position,
    description: item.description,
    quantity: item.quantity.toString(),
    unit: item.unit,
    unitPrice: item.unitPrice.toString(),
    vatRate: item.vatRate,
    lineTotalWithoutVat: item.lineTotalWithoutVat.toString(),
    lineVatAmount: item.lineVatAmount.toString(),
    lineTotalWithVat: item.lineTotalWithVat.toString(),
  };
}

export function mapDetail(
  row: Invoice & { items: InvoiceItem[]; subject: Subject },
): InvoiceDetail {
  const supplier = resolveSupplierSnapshot(row);

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: toEffectiveStatus(row.status, row.dueDate),
    variableSymbol: row.variableSymbol,
    issueDate: row.issueDate.toISOString(),
    taxableSupplyDate: row.taxableSupplyDate.toISOString(),
    dueDate: row.dueDate.toISOString(),
    paymentMethod: row.paymentMethod,
    taxClassification: row.taxClassification,
    reverseChargeCode: row.reverseChargeCode,
    customerName: row.customerName,
    customerIco: row.customerIco,
    customerDic: row.customerDic,
    customerStreet: row.customerStreet,
    customerCity: row.customerCity,
    customerPostalCode: row.customerPostalCode,
    customerCountryCode: row.customerCountryCode,
    note: row.note,
    totalWithoutVat: row.totalWithoutVat.toString(),
    totalVat: row.totalVat.toString(),
    totalWithVat: row.totalWithVat.toString(),
    pdfVersion: row.pdfVersion,
    paidAt: row.paidAt?.toISOString() ?? null,
    supplierBankAccountPrefix: supplier.bankAccountPrefix,
    supplierBankAccountNumber: supplier.bankAccountNumber,
    supplierBankCode: supplier.bankCode,
    supplierIsVatPayer: supplier.isVatPayer,
    items: row.items
      .sort((a, b) => a.position - b.position)
      .map((item) => mapDetailItem(item)),
  };
}
