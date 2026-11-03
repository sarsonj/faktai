import { addDaysDateOnly, formatDateOnlyCz, todayDateOnly } from './date-only';

describe('date-only utils', () => {
  it('returns the Prague calendar day shortly after local midnight (CET)', () => {
    // 2026-01-01 00:30 v Praze = 2025-12-31 23:30 UTC
    const today = todayDateOnly(new Date('2025-12-31T23:30:00.000Z'));
    expect(today.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns the Prague calendar day shortly after local midnight (CEST)', () => {
    // 2026-07-15 01:00 v Praze = 2026-07-14 23:00 UTC
    const today = todayDateOnly(new Date('2026-07-14T23:00:00.000Z'));
    expect(today.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });

  it('adds days in UTC without DST drift', () => {
    const result = addDaysDateOnly(new Date('2026-03-20T00:00:00.000Z'), 14);
    expect(result.toISOString()).toBe('2026-04-03T00:00:00.000Z');
  });

  it('formats date-only values independently of server time zone', () => {
    expect(formatDateOnlyCz(new Date('2026-02-01T00:00:00.000Z'))).toBe(
      '01.02.2026',
    );
  });
});
