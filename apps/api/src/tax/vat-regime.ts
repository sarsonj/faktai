import { TaxClassification } from '@prisma/client';

/**
 * Pravidla DPH režimů faktury (CR-0053).
 *
 * - Neplátce DPH fakturuje vždy bez DPH.
 * - Plátce účtuje DPH jen u tuzemského plnění (`domestic_standard`).
 *   Ostatní režimy (přenesení daňové povinnosti, EU, vývoz, osvobozená plnění)
 *   jsou na faktuře bez DPH a vykazují se v přiznání jen hodnotou plnění.
 */

export const STANDARD_VAT_RATES = [21, 12] as const;

export function chargesVat(
  isVatPayer: boolean,
  classification: TaxClassification | null | undefined,
): boolean {
  if (!isVatPayer) {
    return false;
  }
  return !classification || classification === 'domestic_standard';
}

export function effectiveVatRate(
  isVatPayer: boolean,
  classification: TaxClassification | null | undefined,
  vatRate: number,
): number {
  return chargesVat(isVatPayer, classification) ? vatRate : 0;
}

/**
 * Kódy předmětu plnění pro kontrolní hlášení (oddíl A.1, atribut `kod_pred_pl`).
 * Výběr nejčastějších kódů z číselníku Finanční správy „Kód předmětu plnění“.
 */
export const REVERSE_CHARGE_CODES: ReadonlyArray<{
  code: string;
  label: string;
}> = [
  { code: '4', label: 'Stavební a montážní práce (§ 92e)' },
  { code: '5', label: 'Zboží uvedené v příloze č. 5 – odpad, šrot (§ 92c)' },
  { code: '1', label: 'Zlato (§ 92b)' },
  { code: '3', label: 'Dodání nemovité věci (§ 92d)' },
  { code: '6', label: 'Povolenky na emise skleníkových plynů (§ 92f)' },
  { code: '7', label: 'Obiloviny a technické plodiny (příloha č. 6)' },
  { code: '11', label: 'Kovy (příloha č. 6)' },
  { code: '12', label: 'Mobilní telefony (příloha č. 6)' },
  { code: '13', label: 'Integrované obvody (příloha č. 6)' },
  {
    code: '14',
    label: 'Přenosná zařízení pro automatizované zpracování dat (příloha č. 6)',
  },
  { code: '15', label: 'Videoherní konzole (příloha č. 6)' },
];

export const REVERSE_CHARGE_CODE_VALUES = REVERSE_CHARGE_CODES.map(
  (item) => item.code,
);

/** Povinný text na dokladu podle § 29 ZDPH pro režimy bez DPH. */
export const VAT_REGIME_INVOICE_NOTES: Partial<
  Record<TaxClassification, string>
> = {
  domestic_reverse_charge:
    'Daň odvede zákazník – režim přenesení daňové povinnosti podle § 92a zákona o DPH.',
  eu_service:
    'Daň odvede zákazník (reverse charge) – místo plnění podle § 9 odst. 1 zákona o DPH.',
  eu_goods:
    'Dodání zboží do jiného členského státu osvobozené od daně podle § 64 zákona o DPH.',
  export_third_country:
    'Vývoz zboží osvobozený od daně podle § 66 zákona o DPH.',
  exempt_without_credit:
    'Plnění osvobozené od daně bez nároku na odpočet daně podle § 51 zákona o DPH.',
};

export const NON_VAT_PAYER_INVOICE_NOTE = 'Dodavatel není plátcem DPH.';

/** České DIČ (s prefixem CZ nebo jen číselná část). */
export function isCzVatId(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^(CZ)?\d{8,10}$/.test(value.replace(/\s+/g, '').toUpperCase());
}

/** Kmenová (číselná) část českého DIČ pro XML FÚ. */
export function czVatIdNumber(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, '').toUpperCase().replace(/^CZ/, '');
}
