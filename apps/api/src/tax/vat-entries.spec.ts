import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { mapControlStatement } from '../tax-reports/mapping/control-statement.mapping';
import { mapVatReturn } from '../tax-reports/mapping/vat-return.mapping';
import {
  VatEntry,
  isIssuedByVatPayer,
  vatEntriesFromIssuedInvoice,
} from './vat-entries';

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    invoiceNumber: '2026000001',
    taxClassification: 'domestic_standard',
    reverseChargeCode: null,
    customerName: 'Acme s.r.o.',
    customerDic: 'CZ24755851',
    taxableSupplyDate: new Date('2026-01-15T00:00:00.000Z'),
    totalWithVat: '1452.00',
    supplierSnapshot: { isVatPayer: true },
    items: [
      { vatRate: 21, lineTotalWithoutVat: '1000.00', lineVatAmount: '210.00' },
      { vatRate: 21, lineTotalWithoutVat: '100.00', lineVatAmount: '21.00' },
      { vatRate: 12, lineTotalWithoutVat: '100.00', lineVatAmount: '12.00' },
    ],
    ...overrides,
  } as any;
}

function entry(overrides: Partial<VatEntry>): VatEntry {
  return {
    direction: 'output',
    regime: 'domestic_standard',
    rate: 21,
    base: new Decimal(0),
    vat: new Decimal(0),
    taxableSupplyDate: new Date('2026-01-15T00:00:00.000Z'),
    document: { id: 'd', number: 'd', totalWithVat: new Decimal(0) },
    counterparty: { name: 'X', vatId: 'CZ24755851' },
    reverseChargeCode: null,
    ...overrides,
  };
}

describe('vatEntriesFromIssuedInvoice', () => {
  it('creates one output entry per VAT rate', () => {
    const entries = vatEntriesFromIssuedInvoice(invoice());
    expect(entries).toHaveLength(2);
    const r21 = entries.find((e) => e.rate === 21)!;
    expect(r21.direction).toBe('output');
    expect(r21.base.toFixed(2)).toBe('1100.00');
    expect(r21.vat.toFixed(2)).toBe('231.00');
    expect(r21.document.totalWithVat.toFixed(2)).toBe('1452.00');
  });

  it('rejects an invoice without VAT regime', () => {
    expect(() =>
      vatEntriesFromIssuedInvoice(invoice({ taxClassification: null })),
    ).toThrow(BadRequestException);
  });

  it('detects invoices issued before VAT registration', () => {
    expect(isIssuedByVatPayer(invoice())).toBe(true);
    expect(
      isIssuedByVatPayer(invoice({ supplierSnapshot: { isVatPayer: false } })),
    ).toBe(false);
    expect(isIssuedByVatPayer(invoice({ supplierSnapshot: null }))).toBe(true);
  });
});

describe('mappers ignore input entries until received documents exist', () => {
  it('vat return counts only output', () => {
    const rows = mapVatReturn([
      entry({ base: new Decimal(100), vat: new Decimal(21) }),
      entry({
        direction: 'input',
        base: new Decimal(999),
        vat: new Decimal(210),
      }),
    ]);
    expect(rows.base21).toBe('100');
    expect(rows.outputVat).toBe('21');
  });

  it('puts a document of exactly 10 000 Kč into A.5, above it into A.4', () => {
    const kh = mapControlStatement([
      entry({
        base: new Decimal('8264.46'),
        vat: new Decimal('1735.54'),
        document: {
          id: 'a',
          number: 'a',
          totalWithVat: new Decimal('10000.00'),
        },
      }),
      entry({
        base: new Decimal('8265.29'),
        vat: new Decimal('1735.71'),
        document: {
          id: 'b',
          number: 'b',
          totalWithVat: new Decimal('10001.00'),
        },
      }),
    ]);
    expect(kh.a4.map((row) => row.document.id)).toEqual(['b']);
    expect(kh.a5?.documentCount).toBe(1);
  });
});
