import { BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';

describe('InvoiceService – VAT regimes', () => {
  const service = new InvoiceService({} as any) as any;
  const items = [
    { description: 'A', quantity: '2', unit: 'ks', unitPrice: '100', vatRate: 21 },
    { description: 'B', quantity: '1', unit: 'ks', unitPrice: '50', vatRate: 12 },
  ];

  it('charges VAT for a VAT payer with domestic standard regime', () => {
    const result = service.computeInvoiceTotals(items, {
      isVatPayer: true,
      classification: 'domestic_standard',
    });
    expect(result.totalVat).toBe('48.00');
    expect(result.totalWithVat).toBe('298.00');
  });

  it.each([
    'domestic_reverse_charge',
    'eu_service',
    'eu_goods',
    'export_third_country',
    'exempt_without_credit',
  ])('does not charge VAT in %s regime', (classification) => {
    const result = service.computeInvoiceTotals(items, {
      isVatPayer: true,
      classification,
    });
    expect(result.totalVat).toBe('0.00');
    expect(result.items.map((item: { vatRate: number }) => item.vatRate)).toEqual([0, 0]);
  });

  it('never charges VAT for a non-payer', () => {
    const result = service.computeInvoiceTotals(items, {
      isVatPayer: false,
      classification: 'domestic_standard',
    });
    expect(result.totalVat).toBe('0.00');
    expect(result.totalWithVat).toBe('250.00');
  });

  const issuable = (overrides: Record<string, unknown> = {}) => ({
    taxClassification: 'domestic_standard',
    customerDic: 'CZ24755851',
    reverseChargeCode: null,
    items: [{ vatRate: 21 }],
    ...overrides,
  });
  const payer = { isVatPayer: true };
  const nonPayer = { isVatPayer: false };

  it('accepts a valid domestic invoice', () => {
    expect(() => service.validateReadyToIssue(issuable(), payer)).not.toThrow();
  });

  it('rejects VAT on a non-payer invoice, but does not require classification', () => {
    expect(() =>
      service.validateReadyToIssue(issuable({ taxClassification: null }), nonPayer),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validateReadyToIssue(
        issuable({ taxClassification: null, items: [{ vatRate: 0 }] }),
        nonPayer,
      ),
    ).not.toThrow();
  });

  it('requires Czech DIČ and subject code for reverse charge', () => {
    const base = { taxClassification: 'domestic_reverse_charge', items: [{ vatRate: 0 }] };
    expect(() =>
      service.validateReadyToIssue(issuable({ ...base, reverseChargeCode: '4' }), payer),
    ).not.toThrow();
    expect(() => service.validateReadyToIssue(issuable(base), payer)).toThrow(
      'kód předmětu plnění',
    );
    expect(() =>
      service.validateReadyToIssue(
        issuable({ ...base, reverseChargeCode: '4', customerDic: 'SK2020123456' }),
        payer,
      ),
    ).toThrow('české DIČ');
  });

  it('rejects 0 % items in domestic standard regime', () => {
    expect(() =>
      service.validateReadyToIssue(issuable({ items: [{ vatRate: 0 }] }), payer),
    ).toThrow('21 % nebo 12 %');
  });

  it('rejects VAT items in a zero-rated regime (legacy drafts)', () => {
    expect(() =>
      service.validateReadyToIssue(
        issuable({ taxClassification: 'eu_service', items: [{ vatRate: 21 }] }),
        payer,
      ),
    ).toThrow(BadRequestException);
  });
});
