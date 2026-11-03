import { BadRequestException } from '@nestjs/common';
import { Prisma, ReceivedVatRegime, TaxClassification } from '@prisma/client';
import Decimal from 'decimal.js';
import { chargesVat } from './vat-regime';

/**
 * DPH záznamy (CR-0057) – normalizovaná podoba dokladů pro daňová podání.
 *
 * Každý doklad (dnes vydaná faktura, později přijatý doklad nebo opravný doklad)
 * se převede na záznamy po sazbách. Přiznání k DPH i kontrolní hlášení se pak
 * počítají výhradně z těchto záznamů (`tax-reports/mapping/*`), takže nový typ
 * dokladu znamená jen nový převodník, ne zásah do mapování podání.
 */

/** `output` = daň na výstupu (vydané doklady), `input` = odpočet (přijaté doklady). */
export type VatDirection = 'output' | 'input';

export type VatEntryDocument = {
  id: string;
  /** Evidenční číslo daňového dokladu (KH `c_evid_dd`). */
  number: string;
  /** Celková částka dokladu vč. DPH (limit 10 000 Kč pro KH A.4/B.2). */
  totalWithVat: Decimal;
};

/**
 * Režim plnění. U `output` je to režim vydané faktury, u `input` režim přijatého dokladu
 * (`domestic_standard` = odpočet z tuzemska, `domestic_reverse_charge` / `eu_goods` /
 * `eu_service` = daň vyměřuje příjemce a zároveň ji odečítá).
 */
export type VatEntryRegime = TaxClassification | ReceivedVatRegime;

export type VatEntry = {
  direction: VatDirection;
  regime: VatEntryRegime;
  /** Sazba DPH v % (21 | 12 | 0). */
  rate: number;
  base: Decimal;
  vat: Decimal;
  /** DUZP / datum povinnosti přiznat daň. */
  taxableSupplyDate: Date;
  document: VatEntryDocument;
  counterparty: {
    name: string;
    vatId: string | null;
  };
  /** Kód předmětu plnění pro režim přenesení (KH A.1/B.1). */
  reverseChargeCode: string | null;
};

export type IssuedInvoiceForVat = Prisma.InvoiceGetPayload<{
  include: { items: true };
}>;

function invoiceLabel(invoice: IssuedInvoiceForVat): string {
  return invoice.invoiceNumber ?? invoice.id;
}

/**
 * Byla faktura vystavena plátcem DPH? Rozhoduje snapshot dodavatele
 * (faktury vystavené před registrací k DPH do podání nepatří).
 */
export function isIssuedByVatPayer(invoice: IssuedInvoiceForVat): boolean {
  const snapshot = invoice.supplierSnapshot;
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    return (snapshot as Record<string, unknown>).isVatPayer !== false;
  }
  return true;
}

/** Převod vydané faktury na DPH záznamy (jeden záznam na sazbu). */
export function vatEntriesFromIssuedInvoice(
  invoice: IssuedInvoiceForVat,
): VatEntry[] {
  const regime = invoice.taxClassification;
  if (!regime) {
    throw new BadRequestException(
      `Faktura ${invoiceLabel(invoice)} nemá vyplněný daňový režim.`,
    );
  }

  const vatCharged = chargesVat(true, regime);
  const byRate = new Map<number, { base: Decimal; vat: Decimal }>();
  for (const item of invoice.items) {
    if (vatCharged && item.vatRate !== 21 && item.vatRate !== 12) {
      throw new BadRequestException(
        `Faktura ${invoiceLabel(invoice)} má tuzemské zdanitelné plnění se sazbou ${item.vatRate} %. Opravte sazbu (21 % / 12 %) nebo daňový režim faktury.`,
      );
    }
    const current = byRate.get(item.vatRate) ?? {
      base: new Decimal(0),
      vat: new Decimal(0),
    };
    current.base = current.base.add(item.lineTotalWithoutVat.toString());
    current.vat = current.vat.add(item.lineVatAmount.toString());
    byRate.set(item.vatRate, current);
  }

  const document: VatEntryDocument = {
    id: invoice.id,
    number: invoiceLabel(invoice),
    totalWithVat: new Decimal(invoice.totalWithVat.toString()),
  };

  return [...byRate.entries()].map(([rate, sums]) => ({
    direction: 'output' as const,
    regime,
    rate,
    base: sums.base,
    vat: sums.vat,
    taxableSupplyDate: invoice.taxableSupplyDate,
    document,
    counterparty: {
      name: invoice.customerName,
      vatId: invoice.customerDic,
    },
    reverseChargeCode: invoice.reverseChargeCode,
  }));
}

export type ReceivedDocumentForVat = Prisma.ReceivedDocumentGetPayload<{
  include: { lines: true };
}>;

/**
 * Převod přijatého dokladu na DPH záznamy (směr `input`, jeden záznam na sazbu).
 * Doklady bez nároku na odpočet a řádky bez daně (sazba 0) se do podání nepromítají.
 */
export function vatEntriesFromReceivedDocument(
  document: ReceivedDocumentForVat,
): VatEntry[] {
  if (document.vatRegime === 'no_deduction') {
    return [];
  }
  const byRate = new Map<number, { base: Decimal; vat: Decimal }>();
  for (const line of document.lines) {
    if (line.vatRate !== 21 && line.vatRate !== 12) continue;
    const current = byRate.get(line.vatRate) ?? {
      base: new Decimal(0),
      vat: new Decimal(0),
    };
    current.base = current.base.add(line.base.toString());
    current.vat = current.vat.add(line.vat.toString());
    byRate.set(line.vatRate, current);
  }
  const totalWithVat = new Decimal(document.totalWithoutVat.toString()).add(
    document.totalVat.toString(),
  );
  const entryDocument: VatEntryDocument = {
    id: document.id,
    number: document.documentNumber,
    totalWithVat,
  };
  return [...byRate.entries()].map(([rate, sums]) => ({
    direction: 'input' as const,
    regime: document.vatRegime,
    rate,
    base: sums.base,
    vat: sums.vat,
    taxableSupplyDate: document.taxableSupplyDate,
    document: entryDocument,
    counterparty: {
      name: document.supplierName,
      vatId: document.supplierVatId,
    },
    reverseChargeCode: document.reverseChargeCode,
  }));
}

/** Seskupení záznamů podle dokladu se zachováním pořadí. */
export function groupEntriesByDocument(
  entries: VatEntry[],
): Array<{ document: VatEntryDocument; entries: VatEntry[] }> {
  const groups = new Map<
    string,
    { document: VatEntryDocument; entries: VatEntry[] }
  >();
  for (const entry of entries) {
    const group = groups.get(entry.document.id) ?? {
      document: entry.document,
      entries: [],
    };
    group.entries.push(entry);
    groups.set(entry.document.id, group);
  }
  return [...groups.values()];
}

export function sumEntries(entries: VatEntry[]): {
  base: Decimal;
  vat: Decimal;
} {
  return entries.reduce(
    (sum, entry) => ({
      base: sum.base.add(entry.base),
      vat: sum.vat.add(entry.vat),
    }),
    { base: new Decimal(0), vat: new Decimal(0) },
  );
}
