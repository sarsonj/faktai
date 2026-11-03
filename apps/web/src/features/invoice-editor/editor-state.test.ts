import { describe, expect, it } from 'vitest';
import { calculateTotals, normalizeDecimalInput, roundMoney, type EditorItemState } from './editor-state';

const item = (quantity: string, unitPrice: string, vatRate = 21): EditorItemState => ({
  description: 'x',
  quantity,
  unit: 'ks',
  unitPrice,
  vatRate,
});

describe('editor calculations', () => {
  it('rounds per line like the API (two lines of 0.30 Kč at 21 %)', () => {
    const totals = calculateTotals([item('1', '0.30'), item('1', '0.30')], true);
    // API: DPH 0.06 + 0.06 = 0.12 (ne 0.126 → 0.13)
    expect(totals.vat).toBe(0.12);
    expect(totals.withVat).toBe(0.72);
  });

  it('uses half-even rounding', () => {
    expect(roundMoney(0.125)).toBe(0.12);
    expect(roundMoney(0.135)).toBe(0.14);
  });

  it('accepts decimal comma and spaces', () => {
    expect(normalizeDecimalInput('1 250,50')).toBe('1250.50');
    expect(calculateTotals([item('1,5', '100')], false).withVat).toBe(150);
  });

  it('charges no VAT when not applicable', () => {
    expect(calculateTotals([item('1', '100')], false).vat).toBe(0);
  });
});
