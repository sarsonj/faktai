import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  VatEntry,
  VatEntryDocument,
  groupEntriesByDocument,
  sumEntries,
} from '../../tax/vat-entries';
import { czVatIdNumber, isCzVatId } from '../../tax/vat-regime';

/** Limit pro uvádění dokladu v oddílu A.4 kontrolního hlášení (vč. DPH). */
export const KH_A4_THRESHOLD = new Decimal(10_000);

export type RateSums = {
  base21: Decimal;
  vat21: Decimal;
  base12: Decimal;
  vat12: Decimal;
};

export type ControlStatementA1Row = {
  document: VatEntryDocument;
  counterpartyName: string;
  /** Kmenová (číselná) část DIČ odběratele. */
  customerVatId: string;
  taxableSupplyDate: Date;
  base: Decimal;
  reverseChargeCode: string;
};

export type ControlStatementA4Row = {
  document: VatEntryDocument;
  counterpartyName: string;
  customerVatId: string;
  taxableSupplyDate: Date;
  sums: RateSums;
};

export type ControlStatement = {
  a1: ControlStatementA1Row[];
  a4: ControlStatementA4Row[];
  /** Souhrn oddílu A.5; `null`, pokud v něm nic není. */
  a5: (RateSums & { documentCount: number }) | null;
  /** Věta C – kontrolní součty navázané na řádky přiznání. */
  c: {
    /** ř. 1 přiznání (A.4 + A.5) */
    base21: Decimal;
    /** ř. 2 přiznání (A.4 + A.5) */
    base12: Decimal;
    /** ř. 25 přiznání (A.1) */
    reverseChargeBase: Decimal;
  };
};

function sumByRate(entries: VatEntry[]): RateSums {
  const r21 = sumEntries(entries.filter((entry) => entry.rate === 21));
  const r12 = sumEntries(entries.filter((entry) => entry.rate === 12));
  return { base21: r21.base, vat21: r21.vat, base12: r12.base, vat12: r12.vat };
}

function requireCzVatId(entry: VatEntry): string {
  if (!isCzVatId(entry.counterparty.vatId)) {
    throw new BadRequestException(
      `Faktura ${entry.document.number} nemá české DIČ odběratele pro kontrolní hlášení.`,
    );
  }
  return czVatIdNumber(entry.counterparty.vatId);
}

/**
 * Rozdělení DPH záznamů do oddílů kontrolního hlášení (čistá funkce):
 * - A.1: plnění v režimu přenesení daňové povinnosti (dodavatel), po dokladech,
 * - A.4: tuzemské plnění odběrateli s českým DIČ nad 10 000 Kč vč. DPH, po dokladech,
 * - A.5: ostatní tuzemská plnění souhrnně.
 * Plnění do EU, vývoz a osvobozená plnění se v KH neuvádějí.
 * Strana vstupu (B.1–B.3) přibude s přijatými doklady.
 */
export function mapControlStatement(entries: VatEntry[]): ControlStatement {
  const output = entries.filter((entry) => entry.direction === 'output');
  const a1: ControlStatementA1Row[] = [];
  const a4: ControlStatementA4Row[] = [];
  const a5Entries: VatEntry[] = [];
  let a5DocumentCount = 0;

  for (const group of groupEntriesByDocument(output)) {
    const first = group.entries[0];

    if (first.regime === 'domestic_reverse_charge') {
      if (!first.reverseChargeCode) {
        throw new BadRequestException(
          `Faktura ${group.document.number} v režimu přenesení daňové povinnosti nemá kód předmětu plnění.`,
        );
      }
      a1.push({
        document: group.document,
        counterpartyName: first.counterparty.name,
        customerVatId: requireCzVatId(first),
        taxableSupplyDate: first.taxableSupplyDate,
        base: sumEntries(group.entries).base,
        reverseChargeCode: first.reverseChargeCode,
      });
      continue;
    }

    if (first.regime !== 'domestic_standard') {
      continue;
    }

    if (
      isCzVatId(first.counterparty.vatId) &&
      group.document.totalWithVat.gt(KH_A4_THRESHOLD)
    ) {
      a4.push({
        document: group.document,
        counterpartyName: first.counterparty.name,
        customerVatId: requireCzVatId(first),
        taxableSupplyDate: first.taxableSupplyDate,
        sums: sumByRate(group.entries),
      });
    } else {
      a5Entries.push(...group.entries);
      a5DocumentCount += 1;
    }
  }

  const a5Sums = sumByRate(a5Entries);
  const a4Base21 = a4.reduce(
    (sum, row) => sum.add(row.sums.base21),
    new Decimal(0),
  );
  const a4Base12 = a4.reduce(
    (sum, row) => sum.add(row.sums.base12),
    new Decimal(0),
  );

  return {
    a1,
    a4,
    a5:
      a5DocumentCount > 0
        ? { ...a5Sums, documentCount: a5DocumentCount }
        : null,
    c: {
      base21: a4Base21.add(a5Sums.base21),
      base12: a4Base12.add(a5Sums.base12),
      reverseChargeBase: a1.reduce(
        (sum, row) => sum.add(row.base),
        new Decimal(0),
      ),
    },
  };
}
