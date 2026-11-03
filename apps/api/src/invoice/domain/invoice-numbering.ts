// Formát automatického čísla faktury: YYYY + šestimístné pořadí (např. 2026000001).

export function formatInvoiceNumber(
  year: number,
  currentValue: number,
): string {
  return `${year}${String(currentValue).padStart(6, '0')}`;
}

export function parseInvoiceSequenceForYear(
  invoiceNumber: string | null,
  year: number,
): number | null {
  if (!invoiceNumber) {
    return null;
  }

  const match = invoiceNumber.match(new RegExp(`^${year}(\\d{6})$`));
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}
