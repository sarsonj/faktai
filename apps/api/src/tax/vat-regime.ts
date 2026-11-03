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
 * Úplný číselník platný pro období od 1. 7. 2017 podle Pokynů k vyplnění KH DPH
 * (Finanční správa, verze 2024 – adisspr.mfcr.cz/.../pokyny_dphkh1_2024.pdf).
 * Pořadí: nejčastější kód pro OSVČ (4) první, zbytek dle číselníku.
 */
export const REVERSE_CHARGE_CODES: ReadonlyArray<{
  code: string;
  label: string;
}> = [
  { code: '4', label: 'Stavební a montážní práce' },
  { code: '4a', label: 'Stavební a montážní práce – poskytnutí pracovníků' },
  { code: '1', label: 'Zlato' },
  { code: '1a', label: 'Zlato – zprostředkování dodání investičního zlata' },
  { code: '3', label: 'Dodání nemovité věci' },
  { code: '3a', label: 'Dodání nemovité věci v nuceném prodeji' },
  { code: '5', label: 'Zboží uvedené v příloze č. 5' },
  { code: '6', label: 'Dodání zboží poskytnutého původně jako záruka' },
  { code: '7', label: 'Dodání zboží po postoupení výhrady vlastnictví' },
  { code: '11', label: 'Povolenky na emise skleníkových plynů' },
  { code: '12', label: 'Obiloviny a technické plodiny' },
  { code: '13', label: 'Kovy' },
  { code: '14', label: 'Mobilní telefony' },
  { code: '15', label: 'Integrované obvody' },
  { code: '16', label: 'Přenosná zařízení pro automatizované zpracování dat' },
  { code: '17', label: 'Videoherní konzole' },
  { code: '18', label: 'Dodání certifikátů elektřiny' },
  { code: '19', label: 'Dodání elektřiny soustavami nebo sítěmi obchodníkovi' },
  { code: '20', label: 'Dodání plynu soustavami nebo sítěmi obchodníkovi' },
  {
    code: '21',
    label: 'Poskytnutí vymezených služeb elektronických komunikací',
  },
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
