import { matchesSearch, normalizeSearchText } from './search';

describe('search', () => {
  it('normalizes case and diacritics', () => {
    expect(normalizeSearchText('  ŽLUŤOUČKÝ   Kůň ')).toBe('zlutoucky kun');
  });

  it('matches regardless of case and diacritics', () => {
    expect(matchesSearch(['Český Krumlov s.r.o.'], 'český')).toBe(true);
    expect(matchesSearch(['Český Krumlov s.r.o.'], 'CESKY')).toBe(true);
    expect(matchesSearch(['Český Krumlov s.r.o.'], 'čes kr')).toBe(false);
    expect(matchesSearch([null, '20260012'], '0012')).toBe(true);
    expect(matchesSearch(['Alfa'], 'beta')).toBe(false);
    expect(matchesSearch(['Alfa'], '   ')).toBe(true);
  });
});
