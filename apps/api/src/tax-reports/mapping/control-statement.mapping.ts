import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  VatEntry,
  VatEntryDocument,
  groupEntriesByDocument,
  sumEntries,
} from '../../tax/vat-entries';
import { parseForeignEuVatId } from '../../tax/vat-id';
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

/** A.2 – plnění z EU, u nichž daň přiznává příjemce. */
export type ControlStatementA2Row = {
  document: VatEntryDocument;
  supplierCountryCode: string;
  supplierVatNumber: string;
  taxableSupplyDate: Date;
  sums: RateSums;
};

/** B.1 / B.2 – přijatá plnění po dokladech (dodavatel s českým DIČ). */
export type ControlStatementBRow = {
  document: VatEntryDocument;
  /** Kmenová (číselná) část DIČ dodavatele. */
  supplierVatId: string;
  taxableSupplyDate: Date;
  sums: RateSums;
  /** Jen B.1. */
  reverseChargeCode?: string;
};

export type ControlStatement = {
  a1: ControlStatementA1Row[];
  a2: ControlStatementA2Row[];
  a4: ControlStatementA4Row[];
  /** Souhrn oddílu A.5; `null`, pokud v něm nic není. */
  a5: (RateSums & { documentCount: number }) | null;
  b1: ControlStatementBRow[];
  b2: ControlStatementBRow[];
  /** Souhrn oddílu B.3; `null`, pokud v něm nic není. */
  b3: (RateSums & { documentCount: number }) | null;
  /** Věta C – kontrolní součty navázané na řádky přiznání. */
  c: {
    /** ř. 1 přiznání (A.4 + A.5) */
    base21: Decimal;
    /** ř. 2 přiznání (A.4 + A.5) */
    base12: Decimal;
    /** ř. 25 přiznání (A.1) */
    reverseChargeBase: Decimal;
    /** ř. 3–6 přiznání (A.2) */
    a2Base: Decimal;
    /** ř. 40 přiznání (B.2 + B.3) */
    inputBase21: Decimal;
    /** ř. 41 přiznání (B.2 + B.3) */
    inputBase12: Decimal;
    /** ř. 10 přiznání (B.1) */
    reverseChargeReceivedBase21: Decimal;
    /** ř. 11 přiznání (B.1) */
    reverseChargeReceivedBase12: Decimal;
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
      entry.direction === 'output'
        ? `Faktura ${entry.document.number} nemá české DIČ odběratele pro kontrolní hlášení.`
        : `Přijatý doklad ${entry.document.number} nemá české DIČ dodavatele pro kontrolní hlášení.`,
    );
  }
  return czVatIdNumber(entry.counterparty.vatId);
}

/** Přijatá plnění (směr `input`) → oddíly A.2, B.1, B.2, B.3. */
function mapReceived(entries: VatEntry[]) {
  const a2: ControlStatementA2Row[] = [];
  const b1: ControlStatementBRow[] = [];
  const b2: ControlStatementBRow[] = [];
  const b3Entries: VatEntry[] = [];
  let b3DocumentCount = 0;

  for (const group of groupEntriesByDocument(
    entries.filter((entry) => entry.direction === 'input'),
  )) {
    const first = group.entries[0];
    const sums = sumByRate(group.entries);

    if (first.regime === 'eu_goods' || first.regime === 'eu_service') {
      const vatId = parseForeignEuVatId(first.counterparty.vatId);
      if (!vatId) {
        throw new BadRequestException(
          `Přijatý doklad ${group.document.number} nemá platné VAT ID dodavatele z EU pro kontrolní hlášení.`,
        );
      }
      a2.push({
        document: group.document,
        supplierCountryCode: vatId.countryCode,
        supplierVatNumber: vatId.number,
        taxableSupplyDate: first.taxableSupplyDate,
        sums,
      });
    } else if (first.regime === 'domestic_reverse_charge') {
      if (!first.reverseChargeCode) {
        throw new BadRequestException(
          `Přijatý doklad ${group.document.number} v režimu přenesení daňové povinnosti nemá kód předmětu plnění.`,
        );
      }
      b1.push({
        document: group.document,
        supplierVatId: requireCzVatId(first),
        taxableSupplyDate: first.taxableSupplyDate,
        sums,
        reverseChargeCode: first.reverseChargeCode,
      });
    } else if (first.regime === 'domestic_standard') {
      const supplierVatId = requireCzVatId(first);
      if (group.document.totalWithVat.gt(KH_A4_THRESHOLD)) {
        b2.push({
          document: group.document,
          supplierVatId,
          taxableSupplyDate: first.taxableSupplyDate,
          sums,
        });
      } else {
        b3Entries.push(...group.entries);
        b3DocumentCount += 1;
      }
    }
  }

  return { a2, b1, b2, b3Entries, b3DocumentCount };
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
  const received = mapReceived(entries);
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

  const b3Sums = sumByRate(received.b3Entries);
  const b2Sum = (pick: (sums: RateSums) => Decimal) =>
    received.b2.reduce(
      (total, row) => total.add(pick(row.sums)),
      new Decimal(0),
    );
  const b1Sum = (pick: (sums: RateSums) => Decimal) =>
    received.b1.reduce(
      (total, row) => total.add(pick(row.sums)),
      new Decimal(0),
    );

  return {
    a1,
    a2: received.a2,
    a4,
    a5:
      a5DocumentCount > 0
        ? { ...a5Sums, documentCount: a5DocumentCount }
        : null,
    b1: received.b1,
    b2: received.b2,
    b3:
      received.b3DocumentCount > 0
        ? { ...b3Sums, documentCount: received.b3DocumentCount }
        : null,
    c: {
      base21: a4Base21.add(a5Sums.base21),
      base12: a4Base12.add(a5Sums.base12),
      reverseChargeBase: a1.reduce(
        (sum, row) => sum.add(row.base),
        new Decimal(0),
      ),
      a2Base: received.a2.reduce(
        (sum, row) => sum.add(row.sums.base21).add(row.sums.base12),
        new Decimal(0),
      ),
      inputBase21: b2Sum((sums) => sums.base21).add(b3Sums.base21),
      inputBase12: b2Sum((sums) => sums.base12).add(b3Sums.base12),
      reverseChargeReceivedBase21: b1Sum((sums) => sums.base21),
      reverseChargeReceivedBase12: b1Sum((sums) => sums.base12),
    },
  };
}
