import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REVERSE_CHARGE_CODES } from './vat-regime';

describe('REVERSE_CHARGE_CODES', () => {
  it('contains the complete FS codebook valid from 1. 7. 2017', () => {
    expect(REVERSE_CHARGE_CODES.map((item) => item.code).sort()).toEqual(
      [
        '1',
        '1a',
        '3',
        '3a',
        '4',
        '4a',
        '5',
        '6',
        '7',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
        '21',
      ].sort(),
    );
    expect(REVERSE_CHARGE_CODES.find((item) => item.code === '12')?.label).toBe(
      'Obiloviny a technické plodiny',
    );
  });

  it('is mirrored exactly in the web app', () => {
    const webSource = readFileSync(
      join(__dirname, '../../../web/src/vat-regime.ts'),
      'utf8',
    );
    const webCodes = [
      ...webSource.matchAll(/\{ code: '([^']+)', label: '([^']+)' \}/g),
    ].map((match) => ({ code: match[1], label: match[2] }));
    expect(webCodes).toEqual(REVERSE_CHARGE_CODES);
  });
});
