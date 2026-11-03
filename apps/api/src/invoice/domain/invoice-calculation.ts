import { BadRequestException } from '@nestjs/common';
import { InvoiceItem, TaxClassification } from '@prisma/client';
import Decimal from 'decimal.js';
import { effectiveVatRate } from '../../tax/vat-regime';
import { InvoiceItemDto } from '../dto/invoice-item.dto';

// Výpočty částek faktury. Čisté funkce bez závislosti na DB/Nestu.

export type ComputedItems = {
  items: Array<{
    position: number;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    vatRate: number;
    lineTotalWithoutVat: string;
    lineVatAmount: string;
    lineTotalWithVat: string;
  }>;
  totalWithoutVat: string;
  totalVat: string;
  totalWithVat: string;
};

export function computeInvoiceTotals(
  inputItems: InvoiceItemDto[],
  regime: {
    isVatPayer: boolean;
    classification: TaxClassification | null | undefined;
  },
): ComputedItems {
  if (inputItems.length === 0) {
    throw new BadRequestException('Invoice must contain at least one item');
  }

  const computedItems = inputItems.map((item, index) => {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const vatRate = effectiveVatRate(
      regime.isVatPayer,
      regime.classification,
      item.vatRate,
    );

    if (quantity.lte(0)) {
      throw new BadRequestException('Item quantity must be greater than zero');
    }

    if (unitPrice.lt(0)) {
      throw new BadRequestException('Item unit price cannot be negative');
    }

    const lineTotalWithoutVat = quantity
      .mul(unitPrice)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const lineVatAmount = lineTotalWithoutVat
      .mul(new Decimal(vatRate).div(100))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const lineTotalWithVat = lineTotalWithoutVat
      .add(lineVatAmount)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

    return {
      position: index + 1,
      description: item.description.trim(),
      quantity: quantity.toDecimalPlaces(3, Decimal.ROUND_HALF_EVEN).toFixed(3),
      unit: item.unit.trim(),
      unitPrice: unitPrice
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
        .toFixed(2),
      vatRate,
      lineTotalWithoutVat: lineTotalWithoutVat.toFixed(2),
      lineVatAmount: lineVatAmount.toFixed(2),
      lineTotalWithVat: lineTotalWithVat.toFixed(2),
    };
  });

  const totalWithoutVat = computedItems
    .reduce((sum, item) => sum.add(item.lineTotalWithoutVat), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  const totalVat = computedItems
    .reduce((sum, item) => sum.add(item.lineVatAmount), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  const totalWithVat = totalWithoutVat
    .add(totalVat)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

  return {
    items: computedItems,
    totalWithoutVat: totalWithoutVat.toFixed(2),
    totalVat: totalVat.toFixed(2),
    totalWithVat: totalWithVat.toFixed(2),
  };
}

/** Rekapitulace DPH podle sazeb (PDF). */
export function buildVatRows(items: InvoiceItem[]) {
  const grouped = new Map<
    number,
    { base: Decimal; vat: Decimal; total: Decimal }
  >();
  for (const item of items) {
    const current = grouped.get(item.vatRate) ?? {
      base: new Decimal(0),
      vat: new Decimal(0),
      total: new Decimal(0),
    };
    current.base = current.base.add(item.lineTotalWithoutVat.toString());
    current.vat = current.vat.add(item.lineVatAmount.toString());
    current.total = current.total.add(item.lineTotalWithVat.toString());
    grouped.set(item.vatRate, current);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([rate, values]) => ({
      rate,
      base: values.base.toFixed(2),
      vat: values.vat.toFixed(2),
      total: values.total.toFixed(2),
    }));
}
