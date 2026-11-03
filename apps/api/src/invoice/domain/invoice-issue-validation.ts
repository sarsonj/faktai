import { BadRequestException } from '@nestjs/common';
import { Invoice, InvoiceItem, Subject } from '@prisma/client';
import {
  STANDARD_VAT_RATES,
  chargesVat,
  isCzVatId,
} from '../../tax/vat-regime';

/** Kontroly před vystavením faktury (DPH režim, plátcovství, povinné údaje). */
export function validateReadyToIssue(
  invoice: Invoice & { items: InvoiceItem[] },
  subject: Subject,
): void {
  if (invoice.items.length === 0) {
    throw new BadRequestException(
      'Invoice must have at least one item before issue',
    );
  }

  if (!subject.isVatPayer) {
    if (invoice.items.some((item) => item.vatRate !== 0)) {
      throw new BadRequestException(
        'Neplátce DPH nemůže vystavit fakturu s DPH. Uložte fakturu znovu, položky se přepočítají bez DPH.',
      );
    }
    return;
  }

  const classification = invoice.taxClassification;
  if (!classification) {
    throw new BadRequestException(
      'Tax classification is required before issue',
    );
  }

  if (
    (classification === 'eu_service' || classification === 'eu_goods') &&
    !invoice.customerDic
  ) {
    throw new BadRequestException(
      'Customer DIC is required for EU tax classification',
    );
  }

  if (classification === 'domestic_reverse_charge') {
    if (!isCzVatId(invoice.customerDic)) {
      throw new BadRequestException(
        'Pro režim přenesení daňové povinnosti je povinné české DIČ odběratele.',
      );
    }
    if (!invoice.reverseChargeCode) {
      throw new BadRequestException(
        'Pro režim přenesení daňové povinnosti vyberte kód předmětu plnění.',
      );
    }
  }

  if (chargesVat(true, classification)) {
    const allowedRates: readonly number[] = STANDARD_VAT_RATES;
    if (invoice.items.some((item) => !allowedRates.includes(item.vatRate))) {
      throw new BadRequestException(
        'Položky tuzemského zdanitelného plnění musí mít sazbu 21 % nebo 12 %. Pro plnění bez DPH zvolte odpovídající daňový režim.',
      );
    }
  } else if (invoice.items.some((item) => item.vatRate !== 0)) {
    throw new BadRequestException(
      'Ve zvoleném daňovém režimu se DPH neúčtuje. Uložte fakturu znovu, položky se přepočítají bez DPH.',
    );
  }
}
