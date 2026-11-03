// Datumy faktur jsou kalendářní dny bez času. API je ukládá jako UTC půlnoc,
// proto je potřeba je zobrazovat a počítat v UTC, jinak se v CET/CEST posunou o den.

export function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateInputValue(): string {
  return toLocalDateInputValue(new Date());
}

export function addDaysToDateInputValue(value: string, days: number): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDateCz(value: string): string {
  return new Date(value).toLocaleDateString('cs-CZ', { timeZone: 'UTC' });
}
