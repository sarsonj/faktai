import { isValidIco } from './czech-validators';

describe('isValidIco', () => {
  it('accepts valid ico', () => {
    expect(isValidIco('27074358')).toBe(true);
  });

  it('rejects invalid ico', () => {
    expect(isValidIco('12345678')).toBe(false);
  });
});
