// Identifikace k DPH: české DIČ a VAT ID z jiných členských států EU.

/** Kódy států EU pro VAT ID (Řecko = EL, Severní Irsko = XI). */
export const EU_VAT_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'EL',
  'ES',
  'FI',
  'FR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  'XI',
]);

export function normalizeVatId(value: string | null | undefined): string {
  return (value ?? '').replace(/[\s.-]+/g, '').toUpperCase();
}

/** VAT ID z jiného členského státu → kód státu + číslo (KH A.2 `k_stat`, `vatid_dod`). */
export function parseForeignEuVatId(
  value: string | null | undefined,
): { countryCode: string; number: string } | null {
  const match = /^([A-Z]{2})([0-9A-Z+*]{2,12})$/.exec(normalizeVatId(value));
  if (!match || match[1] === 'CZ' || !EU_VAT_COUNTRY_CODES.has(match[1])) {
    return null;
  }
  return { countryCode: match[1], number: match[2] };
}
