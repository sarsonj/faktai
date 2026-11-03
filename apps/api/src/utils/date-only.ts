// Datumy dokladů (vystavení, DUZP, splatnost, úhrada) jsou kalendářní dny.
// Ukládají se jako UTC půlnoc daného dne, aby nezávisely na časovém pásmu serveru.

export const BUSINESS_TIME_ZONE = 'Europe/Prague';

/** Dnešní kalendářní den v ČR jako UTC půlnoc. */
export function todayDateOnly(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

export function addDaysDateOnly(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Formát DD.MM.YYYY (FÚ i PDF). */
export function formatDateOnlyCz(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${value.getUTCFullYear()}`;
}
