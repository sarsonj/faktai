import Decimal from 'decimal.js';
import { VatEntry, sumEntries } from '../../tax/vat-entries';

/**
 * Mapování DPH záznamů na řádky přiznání k DPH (DP3). Čistá funkce.
 * Hodnoty jsou zaokrouhlené na celé koruny; ř. 62 je součet zaokrouhlených řádků.
 *
 * Zatím jen strana výstupu (vydané doklady). Strana vstupu (ř. 40–41, odpočet)
 * přibude s přijatými doklady.
 */
export type VatReturnRows = {
  /** ř. 1 – tuzemské zdanitelné plnění, základní sazba (základ, daň) */
  base21: string;
  vat21: string;
  /** ř. 2 – tuzemské zdanitelné plnění, snížená sazba */
  base12: string;
  vat12: string;
  /** ř. 20 – dodání zboží do jiného členského státu (§ 64) */
  euGoods: string;
  /** ř. 21 – služby s místem plnění v jiném členském státě (§ 9 odst. 1) */
  euServices: string;
  /** ř. 22 – vývoz zboží (§ 66) */
  exportGoods: string;
  /** ř. 25 – plnění v režimu přenesení daňové povinnosti (dodavatel, § 92a) */
  reverseCharge: string;
  /** ř. 50 – plnění osvobozená od daně bez nároku na odpočet (§ 51) */
  exemptWithoutCredit: string;
  /** ř. 62 / 64 – daň na výstupu celkem / vlastní daňová povinnost */
  outputVat: string;
};

export function formatWholeCzk(value: Decimal.Value): string {
  return new Decimal(value)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toFixed(0);
}

export function mapVatReturn(entries: VatEntry[]): VatReturnRows {
  const output = entries.filter((entry) => entry.direction === 'output');
  const pick = (predicate: (entry: VatEntry) => boolean) =>
    sumEntries(output.filter(predicate));

  const domestic21 = pick(
    (e) => e.regime === 'domestic_standard' && e.rate === 21,
  );
  const domestic12 = pick(
    (e) => e.regime === 'domestic_standard' && e.rate === 12,
  );
  const vat21 = formatWholeCzk(domestic21.vat);
  const vat12 = formatWholeCzk(domestic12.vat);

  return {
    base21: formatWholeCzk(domestic21.base),
    vat21,
    base12: formatWholeCzk(domestic12.base),
    vat12,
    euGoods: formatWholeCzk(pick((e) => e.regime === 'eu_goods').base),
    euServices: formatWholeCzk(pick((e) => e.regime === 'eu_service').base),
    exportGoods: formatWholeCzk(
      pick((e) => e.regime === 'export_third_country').base,
    ),
    reverseCharge: formatWholeCzk(
      pick((e) => e.regime === 'domestic_reverse_charge').base,
    ),
    exemptWithoutCredit: formatWholeCzk(
      pick((e) => e.regime === 'exempt_without_credit').base,
    ),
    outputVat: new Decimal(vat21).add(vat12).toFixed(0),
  };
}
