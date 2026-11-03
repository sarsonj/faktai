import type { ReceivedVatRegime, TaxClassification } from './types';

// Kódy předmětu plnění pro kontrolní hlášení (oddíl A.1, `kod_pred_pl`).
// Musí odpovídat `REVERSE_CHARGE_CODES` v apps/api/src/tax/vat-regime.ts.
export const REVERSE_CHARGE_CODES: ReadonlyArray<{ code: string; label: string }> = [
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
  { code: '21', label: 'Poskytnutí vymezených služeb elektronických komunikací' },
];

export const TAX_CLASSIFICATION_LABELS: Record<TaxClassification, string> = {
  domestic_standard: 'Tuzemské zdanitelné plnění',
  domestic_reverse_charge: 'Tuzemské reverse charge (přenesení daňové povinnosti)',
  eu_service: 'Služba do EU',
  eu_goods: 'Dodání zboží do EU',
  export_third_country: 'Export mimo EU',
  exempt_without_credit: 'Osvobozené bez nároku na odpočet',
};

export const RECEIVED_VAT_REGIME_LABELS: Record<ReceivedVatRegime, { label: string; short: string; hint: string }> = {
  domestic_standard: {
    label: 'Tuzemsko s DPH (odpočet)',
    short: 'Tuzemsko',
    hint: 'Odpočet DPH na ř. 40/41, v KH oddíl B.2 (nad 10 000 Kč) nebo B.3.',
  },
  domestic_reverse_charge: {
    label: 'Přenesení daňové povinnosti (přiznávám daň)',
    short: 'Přenesení',
    hint: 'Daň přiznáte na ř. 10/11 a odečtete na ř. 43/44, v KH oddíl B.1.',
  },
  eu_service: {
    label: 'Služba z EU (§ 9 odst. 1)',
    short: 'Služba z EU',
    hint: 'Daň přiznáte na ř. 5/6 a odečtete na ř. 43/44, v KH oddíl A.2.',
  },
  eu_goods: {
    label: 'Pořízení zboží z EU',
    short: 'Zboží z EU',
    hint: 'Daň přiznáte na ř. 3/4 a odečtete na ř. 43/44, v KH oddíl A.2.',
  },
  no_deduction: {
    label: 'Bez nároku na odpočet',
    short: 'Bez odpočtu',
    hint: 'Doklad se eviduje, ale do přiznání ani kontrolního hlášení nevstupuje.',
  },
};

/** Režimy, kde daň vyměřuje příjemce – DPH se dopočítá a neplatí se dodavateli. */
export function isSelfAssessedRegime(regime: ReceivedVatRegime): boolean {
  return regime === 'domestic_reverse_charge' || regime === 'eu_goods' || regime === 'eu_service';
}
