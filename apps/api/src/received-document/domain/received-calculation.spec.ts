import { BadRequestException } from '@nestjs/common';
import {
  computeReceivedDocument,
  validateReceivedDocument,
} from './received-calculation';
import { parseForeignEuVatId } from '../../tax/vat-id';

const base = {
  supplierVatId: 'CZ24755851',
  reverseChargeCode: null,
  taxableSupplyDate: new Date('2026-10-10T00:00:00.000Z'),
  deductionDate: new Date('2026-10-10T00:00:00.000Z'),
  lines: [{ vatRate: 21, vat: '210.00' }],
};
const payer = { isVatPayer: true };

describe('computeReceivedDocument', () => {
  it('keeps supplier VAT for domestic documents and adds it to the payable amount', () => {
    const result = computeReceivedDocument(
      [{ vatRate: 21, base: '1000', vat: '210.01' }],
      'domestic_standard',
    );
    expect(result.totalVat).toBe('210.01');
    expect(result.totalPayable).toBe('1210.01');
  });

  it('computes VAT when not given', () => {
    const result = computeReceivedDocument(
      [{ vatRate: 12, base: '100' }],
      'domestic_standard',
    );
    expect(result.lines[0].vat).toBe('12.00');
  });

  it('self-assesses VAT for EU/reverse charge and excludes it from the payable amount', () => {
    const result = computeReceivedDocument(
      [{ vatRate: 21, base: '1000', vat: '999' }],
      'eu_service',
    );
    expect(result.totalVat).toBe('210.00');
    expect(result.totalPayable).toBe('1000.00');
  });
});

describe('validateReceivedDocument', () => {
  it('accepts a domestic document with Czech DIČ', () => {
    expect(() =>
      validateReceivedDocument(
        { ...base, vatRegime: 'domestic_standard' },
        payer,
      ),
    ).not.toThrow();
  });

  it('requires Czech DIČ to deduct domestic VAT', () => {
    expect(() =>
      validateReceivedDocument(
        { ...base, vatRegime: 'domestic_standard', supplierVatId: null },
        payer,
      ),
    ).toThrow('české DIČ');
  });

  it('requires EU VAT ID for EU acquisitions', () => {
    expect(() =>
      validateReceivedDocument({ ...base, vatRegime: 'eu_service' }, payer),
    ).toThrow('VAT ID');
    expect(() =>
      validateReceivedDocument(
        { ...base, vatRegime: 'eu_service', supplierVatId: 'DE 123 456 789' },
        payer,
      ),
    ).not.toThrow();
  });

  it('requires subject code for received reverse charge', () => {
    expect(() =>
      validateReceivedDocument(
        { ...base, vatRegime: 'domestic_reverse_charge' },
        payer,
      ),
    ).toThrow('kód předmětu plnění');
  });

  it('allows only no_deduction for non-payers', () => {
    expect(() =>
      validateReceivedDocument(
        { ...base, vatRegime: 'domestic_standard' },
        { isVatPayer: false },
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      validateReceivedDocument(
        { ...base, vatRegime: 'no_deduction' },
        { isVatPayer: false },
      ),
    ).not.toThrow();
  });

  it('rejects deduction before DUZP', () => {
    expect(() =>
      validateReceivedDocument(
        {
          ...base,
          vatRegime: 'domestic_standard',
          deductionDate: new Date('2026-09-30T00:00:00.000Z'),
        },
        payer,
      ),
    ).toThrow('nejdříve');
  });
});

describe('parseForeignEuVatId', () => {
  it('parses foreign EU VAT IDs and rejects Czech or unknown prefixes', () => {
    expect(parseForeignEuVatId('de 123.456.789')).toEqual({
      countryCode: 'DE',
      number: '123456789',
    });
    expect(parseForeignEuVatId('CZ24755851')).toBeNull();
    expect(parseForeignEuVatId('US123456')).toBeNull();
  });
});
