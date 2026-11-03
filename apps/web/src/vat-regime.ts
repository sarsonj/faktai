import type { TaxClassification } from './types';

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
