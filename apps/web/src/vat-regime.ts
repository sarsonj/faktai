// Kódy předmětu plnění pro kontrolní hlášení (oddíl A.1, `kod_pred_pl`).
// Musí odpovídat `REVERSE_CHARGE_CODES` v apps/api/src/tax/vat-regime.ts.
export const REVERSE_CHARGE_CODES: ReadonlyArray<{ code: string; label: string }> = [
  { code: '4', label: 'Stavební a montážní práce (§ 92e)' },
  { code: '5', label: 'Zboží uvedené v příloze č. 5 – odpad, šrot (§ 92c)' },
  { code: '1', label: 'Zlato (§ 92b)' },
  { code: '3', label: 'Dodání nemovité věci (§ 92d)' },
  { code: '6', label: 'Povolenky na emise skleníkových plynů (§ 92f)' },
  { code: '7', label: 'Obiloviny a technické plodiny (příloha č. 6)' },
  { code: '11', label: 'Kovy (příloha č. 6)' },
  { code: '12', label: 'Mobilní telefony (příloha č. 6)' },
  { code: '13', label: 'Integrované obvody (příloha č. 6)' },
  { code: '14', label: 'Přenosná zařízení pro automatizované zpracování dat (příloha č. 6)' },
  { code: '15', label: 'Videoherní konzole (příloha č. 6)' },
];
