import Decimal from 'decimal.js';
import { VatEntry, sumEntries } from '../../tax/vat-entries';

/**
 * Mapování DPH záznamů na řádky přiznání k DPH (DP3). Čistá funkce.
 * Hodnoty jsou zaokrouhlené na celé koruny po řádcích; součtové řádky
 * (46, 62, 63) jsou součty zaokrouhlených řádků.
 *
 * Výstup (vydané doklady): ř. 1, 2, 20, 21, 22, 25, 50.
 * Vstup (přijaté doklady, CR-0060):
 * - tuzemsko s DPH → odpočet ř. 40/41,
 * - přenesení (příjemce) → daň ř. 10/11 + odpočet ř. 43/44,
 * - pořízení zboží z EU → daň ř. 3/4 + odpočet ř. 43/44,
 * - služba z EU (§ 9/1) → daň ř. 5/6 + odpočet ř. 43/44.
 * Odpočet se uplatňuje v plné výši (krácený a poměrný odpočet aplikace nepodporuje).
 */
export type VatReturnRows = {
  /** ř. 1 – tuzemské zdanitelné plnění, základní sazba (základ, daň) */
  base21: string;
  vat21: string;
  /** ř. 2 – tuzemské zdanitelné plnění, snížená sazba */
  base12: string;
  vat12: string;
  /** ř. 3/4 – pořízení zboží z jiného členského státu */
  euGoodsAcq21: { base: string; vat: string };
  euGoodsAcq12: { base: string; vat: string };
  /** ř. 5/6 – přijetí služby z jiného členského státu (§ 9 odst. 1) */
  euServiceAcq21: { base: string; vat: string };
  euServiceAcq12: { base: string; vat: string };
  /** ř. 10/11 – přijetí plnění v režimu přenesení daňové povinnosti */
  reverseChargeReceived21: { base: string; vat: string };
  reverseChargeReceived12: { base: string; vat: string };
  /** ř. 20 – dodání zboží do jiného členského státu (§ 64) */
  euGoods: string;
  /** ř. 21 – služby s místem plnění v jiném členském státě (§ 9 odst. 1) */
  euServices: string;
  /** ř. 22 – vývoz zboží (§ 66) */
  exportGoods: string;
  /** ř. 25 – plnění v režimu přenesení daňové povinnosti (dodavatel, § 92a) */
  reverseCharge: string;
  /** ř. 40/41 – přijatá zdanitelná plnění od plátců v tuzemsku (základ, odpočet v plné výši) */
  domesticInput21: { base: string; deduction: string };
  domesticInput12: { base: string; deduction: string };
  /** ř. 43/44 – plnění, u nichž daň přiznává příjemce (ř. 3–13) */
  selfAssessedInput21: { base: string; deduction: string };
  selfAssessedInput12: { base: string; deduction: string };
  /** ř. 46 – odpočet daně celkem v plné výši */
  deductionTotal: string;
  /** ř. 50 – plnění osvobozená od daně bez nároku na odpočet (§ 51) */
  exemptWithoutCredit: string;
  /** ř. 62 – daň na výstupu celkem */
  outputVat: string;
  /** ř. 63 – odpočet daně celkem */
  deductionVat: string;
  /** ř. 64 – vlastní daňová povinnost */
  taxDue: string;
  /** ř. 65 – nadměrný odpočet */
  excessDeduction: string;
};

export function formatWholeCzk(value: Decimal.Value): string {
  return new Decimal(value)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toFixed(0);
}

const SELF_ASSESSED = new Set([
  'domestic_reverse_charge',
  'eu_goods',
  'eu_service',
]);

export function mapVatReturn(entries: VatEntry[]): VatReturnRows {
  const output = entries.filter((entry) => entry.direction === 'output');
  const input = entries.filter((entry) => entry.direction === 'input');
  const pickOut = (predicate: (entry: VatEntry) => boolean) =>
    sumEntries(output.filter(predicate));
  const pickIn = (predicate: (entry: VatEntry) => boolean) =>
    sumEntries(input.filter(predicate));
  const pair = (sums: { base: Decimal; vat: Decimal }) => ({
    base: formatWholeCzk(sums.base),
    vat: formatWholeCzk(sums.vat),
  });
  const deductionPair = (sums: { base: Decimal; vat: Decimal }) => ({
    base: formatWholeCzk(sums.base),
    deduction: formatWholeCzk(sums.vat),
  });

  const domestic21 = pickOut(
    (e) => e.regime === 'domestic_standard' && e.rate === 21,
  );
  const domestic12 = pickOut(
    (e) => e.regime === 'domestic_standard' && e.rate === 12,
  );

  const euGoodsAcq21 = pair(
    pickIn((e) => e.regime === 'eu_goods' && e.rate === 21),
  );
  const euGoodsAcq12 = pair(
    pickIn((e) => e.regime === 'eu_goods' && e.rate === 12),
  );
  const euServiceAcq21 = pair(
    pickIn((e) => e.regime === 'eu_service' && e.rate === 21),
  );
  const euServiceAcq12 = pair(
    pickIn((e) => e.regime === 'eu_service' && e.rate === 12),
  );
  const rcReceived21 = pair(
    pickIn((e) => e.regime === 'domestic_reverse_charge' && e.rate === 21),
  );
  const rcReceived12 = pair(
    pickIn((e) => e.regime === 'domestic_reverse_charge' && e.rate === 12),
  );

  const domesticInput21 = deductionPair(
    pickIn((e) => e.regime === 'domestic_standard' && e.rate === 21),
  );
  const domesticInput12 = deductionPair(
    pickIn((e) => e.regime === 'domestic_standard' && e.rate === 12),
  );
  const selfAssessedInput21 = deductionPair(
    pickIn((e) => SELF_ASSESSED.has(e.regime) && e.rate === 21),
  );
  const selfAssessedInput12 = deductionPair(
    pickIn((e) => SELF_ASSESSED.has(e.regime) && e.rate === 12),
  );

  const vat21 = formatWholeCzk(domestic21.vat);
  const vat12 = formatWholeCzk(domestic12.vat);
  const sum = (values: string[]) =>
    values.reduce((total, value) => total.add(value), new Decimal(0));

  const outputVat = sum([
    vat21,
    vat12,
    euGoodsAcq21.vat,
    euGoodsAcq12.vat,
    euServiceAcq21.vat,
    euServiceAcq12.vat,
    rcReceived21.vat,
    rcReceived12.vat,
  ]);
  const deductionTotal = sum([
    domesticInput21.deduction,
    domesticInput12.deduction,
    selfAssessedInput21.deduction,
    selfAssessedInput12.deduction,
  ]);
  const balance = outputVat.sub(deductionTotal);

  return {
    base21: formatWholeCzk(domestic21.base),
    vat21,
    base12: formatWholeCzk(domestic12.base),
    vat12,
    euGoodsAcq21,
    euGoodsAcq12,
    euServiceAcq21,
    euServiceAcq12,
    reverseChargeReceived21: rcReceived21,
    reverseChargeReceived12: rcReceived12,
    euGoods: formatWholeCzk(pickOut((e) => e.regime === 'eu_goods').base),
    euServices: formatWholeCzk(pickOut((e) => e.regime === 'eu_service').base),
    exportGoods: formatWholeCzk(
      pickOut((e) => e.regime === 'export_third_country').base,
    ),
    reverseCharge: formatWholeCzk(
      pickOut((e) => e.regime === 'domestic_reverse_charge').base,
    ),
    domesticInput21,
    domesticInput12,
    selfAssessedInput21,
    selfAssessedInput12,
    deductionTotal: deductionTotal.toFixed(0),
    exemptWithoutCredit: formatWholeCzk(
      pickOut((e) => e.regime === 'exempt_without_credit').base,
    ),
    outputVat: outputVat.toFixed(0),
    deductionVat: deductionTotal.toFixed(0),
    taxDue: Decimal.max(balance, 0).toFixed(0),
    excessDeduction: Decimal.max(balance.neg(), 0).toFixed(0),
  };
}
