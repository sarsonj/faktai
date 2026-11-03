import { addDaysToDateInputValue, todayDateInputValue } from '../../date-utils';
import type { InvoiceDetail, InvoiceItemInput, InvoiceUpsertInput, TaxClassification } from '../../types';

// Stav a výpočty editoru faktury (čisté funkce, bez Reactu).

export type EditorItemState = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
};

export type EditorState = {
  invoiceNumber: string;
  variableSymbol: string;
  issueDate: string;
  taxableSupplyDate: string;
  dueDate: string;
  taxClassification: TaxClassification;
  reverseChargeCode: string;
  customerName: string;
  customerIco: string;
  customerDic: string;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountryCode: string;
  note: string;
  items: EditorItemState[];
};

export function createEmptyItem(): EditorItemState {
  return { description: '', quantity: '1', unit: 'ks', unitPrice: '0.00', vatRate: 21 };
}

export function createDefaultState(defaultDueDays = 14): EditorState {
  const issueDate = todayDateInputValue();
  return {
    invoiceNumber: '',
    variableSymbol: '',
    issueDate,
    taxableSupplyDate: issueDate,
    dueDate: addDaysToDateInputValue(issueDate, defaultDueDays),
    taxClassification: 'domestic_standard',
    reverseChargeCode: '',
    customerName: '',
    customerIco: '',
    customerDic: '',
    customerStreet: '',
    customerCity: '',
    customerPostalCode: '',
    customerCountryCode: 'CZ',
    note: '',
    items: [createEmptyItem()],
  };
}

function itemsFrom(invoice: InvoiceDetail): EditorItemState[] {
  return invoice.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    vatRate: item.vatRate,
  }));
}

export function fromInvoice(invoice: InvoiceDetail): EditorState {
  return {
    invoiceNumber: invoice.invoiceNumber ?? '',
    variableSymbol: invoice.variableSymbol,
    issueDate: invoice.issueDate.slice(0, 10),
    taxableSupplyDate: invoice.taxableSupplyDate.slice(0, 10),
    dueDate: invoice.dueDate.slice(0, 10),
    taxClassification: invoice.taxClassification ?? 'domestic_standard',
    reverseChargeCode: invoice.reverseChargeCode ?? '',
    customerName: invoice.customerName,
    customerIco: invoice.customerIco ?? '',
    customerDic: invoice.customerDic ?? '',
    customerStreet: invoice.customerStreet,
    customerCity: invoice.customerCity,
    customerPostalCode: invoice.customerPostalCode,
    customerCountryCode: invoice.customerCountryCode,
    note: invoice.note ?? '',
    items: itemsFrom(invoice),
  };
}

/** Nová faktura podle jiné: odběratel, režim, položky a poznámka; nová data a číslo. */
export function createStateFromCopySource(source: InvoiceDetail, defaultDueDays: number): EditorState {
  const base = createDefaultState(defaultDueDays);
  const copied = fromInvoice(source);
  return {
    ...copied,
    invoiceNumber: '',
    variableSymbol: '',
    issueDate: base.issueDate,
    taxableSupplyDate: base.issueDate,
    dueDate: base.dueDate,
    items: copied.items.length > 0 ? copied.items : [createEmptyItem()],
  };
}

/** Desetinná čárka i mezery („1 250,50“) → „1250.50“. */
export function normalizeDecimalInput(value: string): string {
  return value.replace(/\s+/g, '').replace(',', '.');
}

export function toPayload(state: EditorState): InvoiceUpsertInput {
  return {
    invoiceNumber: state.invoiceNumber || undefined,
    variableSymbol: state.variableSymbol || undefined,
    issueDate: state.issueDate,
    taxableSupplyDate: state.taxableSupplyDate,
    dueDate: state.dueDate,
    taxClassification: state.taxClassification,
    reverseChargeCode:
      state.taxClassification === 'domestic_reverse_charge' ? state.reverseChargeCode || undefined : undefined,
    customerName: state.customerName,
    customerIco: state.customerIco || undefined,
    customerDic: state.customerDic || undefined,
    customerStreet: state.customerStreet,
    customerCity: state.customerCity,
    customerPostalCode: state.customerPostalCode,
    customerCountryCode: state.customerCountryCode,
    note: state.note || undefined,
    items: state.items.map<InvoiceItemInput>((item) => ({
      description: item.description,
      quantity: normalizeDecimalInput(item.quantity),
      unit: item.unit,
      unitPrice: normalizeDecimalInput(item.unitPrice),
      vatRate: Number(item.vatRate),
    })),
  };
}

/** DPH se účtuje jen plátcem v režimu tuzemského zdanitelného plnění (stejně jako na API). */
export function chargesVat(isVatPayer: boolean, classification: TaxClassification): boolean {
  return isVatPayer && classification === 'domestic_standard';
}

/** Zaokrouhlení na haléře „half-even“ – stejně jako backend (decimal.js ROUND_HALF_EVEN). */
export function roundMoney(value: number): number {
  const scaled = value * 100;
  const floor = Math.floor(scaled);
  if (Math.abs(scaled - floor - 0.5) < 1e-7) {
    return (floor % 2 === 0 ? floor : floor + 1) / 100;
  }
  return Math.round(scaled) / 100;
}

function parseNumber(value: string): number {
  const parsed = Number(normalizeDecimalInput(value || '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export type LineTotals = { withoutVat: number; vat: number; withVat: number };

/** Řádek se zaokrouhluje stejně jako na API: základ, pak DPH ze zaokrouhleného základu. */
export function calculateLine(item: EditorItemState, vatCharged: boolean): LineTotals {
  const withoutVat = roundMoney(parseNumber(item.quantity) * parseNumber(item.unitPrice));
  const vat = vatCharged ? roundMoney((withoutVat * Number(item.vatRate || 0)) / 100) : 0;
  return { withoutVat, vat, withVat: roundMoney(withoutVat + vat) };
}

export function calculateTotals(items: EditorItemState[], vatCharged: boolean): LineTotals {
  const lines = items.map((item) => calculateLine(item, vatCharged));
  const withoutVat = roundMoney(lines.reduce((sum, line) => sum + line.withoutVat, 0));
  const vat = roundMoney(lines.reduce((sum, line) => sum + line.vat, 0));
  return { withoutVat, vat, withVat: roundMoney(withoutVat + vat) };
}
