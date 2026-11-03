import { BadRequestException } from '@nestjs/common';
import { ReceivedVatRegime } from '@prisma/client';
import Decimal from 'decimal.js';
import { parseForeignEuVatId } from '../../tax/vat-id';
import { isCzVatId } from '../../tax/vat-regime';

// Výpočty a validace přijatých dokladů (CR-0060). Čisté funkce.

export type ReceivedLineInput = { vatRate: number; base: string; vat?: string };

export type ComputedReceivedDocument = {
  lines: Array<{
    position: number;
    vatRate: number;
    base: string;
    vat: string;
  }>;
  totalWithoutVat: string;
  totalVat: string;
  totalPayable: string;
};

/** Režimy, kde daň vyměřuje příjemce (přenesení, EU) – daň se dopočítá, dodavatel ji neúčtuje. */
export function isSelfAssessed(regime: ReceivedVatRegime): boolean {
  return (
    regime === 'domestic_reverse_charge' ||
    regime === 'eu_goods' ||
    regime === 'eu_service'
  );
}

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

export function computeReceivedDocument(
  lines: ReceivedLineInput[],
  regime: ReceivedVatRegime,
): ComputedReceivedDocument {
  if (lines.length === 0) {
    throw new BadRequestException(
      'Doklad musí obsahovat alespoň jeden řádek rozpisu DPH.',
    );
  }
  const selfAssessed = isSelfAssessed(regime);
  const computed = lines.map((line, index) => {
    const base = money(new Decimal(line.base));
    const calculatedVat = money(base.mul(line.vatRate).div(100));
    // U tuzemských dokladů platí DPH uvedená dodavatelem (může se lišit zaokrouhlením);
    // u přenesení a EU si daň vyměřuje příjemce sám.
    const vat =
      !selfAssessed && line.vat !== undefined && line.vat !== ''
        ? money(new Decimal(line.vat))
        : calculatedVat;
    return {
      position: index + 1,
      vatRate: line.vatRate,
      base: base.toFixed(2),
      vat: vat.toFixed(2),
    };
  });
  const totalWithoutVat = computed.reduce(
    (sum, line) => sum.add(line.base),
    new Decimal(0),
  );
  const totalVat = computed.reduce(
    (sum, line) => sum.add(line.vat),
    new Decimal(0),
  );
  const totalPayable = selfAssessed
    ? totalWithoutVat
    : totalWithoutVat.add(totalVat);
  return {
    lines: computed,
    totalWithoutVat: totalWithoutVat.toFixed(2),
    totalVat: totalVat.toFixed(2),
    totalPayable: totalPayable.toFixed(2),
  };
}

export type ReceivedDocumentForValidation = {
  vatRegime: ReceivedVatRegime;
  supplierVatId: string | null;
  reverseChargeCode: string | null;
  taxableSupplyDate: Date;
  deductionDate: Date;
  lines: Array<{ vatRate: number; vat: string }>;
};

/** Kontroly přijatého dokladu podle režimu DPH a plátcovství odběratele. */
export function validateReceivedDocument(
  document: ReceivedDocumentForValidation,
  subject: { isVatPayer: boolean },
): void {
  const regime = document.vatRegime;
  if (!subject.isVatPayer && regime !== 'no_deduction') {
    throw new BadRequestException(
      'Neplátce DPH eviduje přijaté doklady jen v režimu „bez nároku na odpočet“.',
    );
  }
  if (document.deductionDate < document.taxableSupplyDate) {
    throw new BadRequestException(
      'Odpočet lze uplatnit nejdříve v období, kdy nastalo DUZP.',
    );
  }
  const rates = document.lines.map((line) => line.vatRate);

  if (regime === 'domestic_standard') {
    const hasVat = document.lines.some((line) => new Decimal(line.vat).gt(0));
    if (hasVat && !isCzVatId(document.supplierVatId)) {
      throw new BadRequestException(
        'Pro odpočet DPH z tuzemského dokladu je povinné české DIČ dodavatele.',
      );
    }
    return;
  }

  if (
    isSelfAssessed(regime) &&
    rates.some((rate) => rate !== 21 && rate !== 12)
  ) {
    throw new BadRequestException(
      'V režimu, kdy daň přiznává příjemce, uveďte sazbu 21 % nebo 12 %.',
    );
  }

  if (regime === 'domestic_reverse_charge') {
    if (!isCzVatId(document.supplierVatId)) {
      throw new BadRequestException(
        'Pro přenesení daňové povinnosti je povinné české DIČ dodavatele.',
      );
    }
    if (!document.reverseChargeCode) {
      throw new BadRequestException(
        'Pro přenesení daňové povinnosti vyberte kód předmětu plnění.',
      );
    }
  }

  if (
    (regime === 'eu_goods' || regime === 'eu_service') &&
    !parseForeignEuVatId(document.supplierVatId)
  ) {
    throw new BadRequestException(
      'Pro plnění z EU zadejte VAT ID dodavatele včetně kódu státu (např. DE123456789).',
    );
  }
}
