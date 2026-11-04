import { UnprocessableEntityException } from '@nestjs/common';

// QR platba (SPD) a převod českého účtu na IBAN.

export function toCzIban(
  bankAccountPrefix: string | null,
  bankAccountNumber: string,
  bankCode: string,
): string {
  if (!/^\d{2,10}$/.test(bankAccountNumber)) {
    throw new UnprocessableEntityException(
      'Nevalidní číslo účtu pro QR platbu',
    );
  }
  if (bankAccountPrefix && !/^\d{1,6}$/.test(bankAccountPrefix)) {
    throw new UnprocessableEntityException(
      'Nevalidní prefix účtu pro QR platbu',
    );
  }
  if (!/^\d{4}$/.test(bankCode)) {
    throw new UnprocessableEntityException('Nevalidní kód banky pro QR platbu');
  }

  const prefix = (bankAccountPrefix ?? '').padStart(6, '0');
  const number = bankAccountNumber.padStart(10, '0');
  const bban = `${bankCode}${prefix}${number}`;
  const rearranged = `${bban}CZ00`;

  let numeric = '';
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numeric += String(char.charCodeAt(0) - 55);
    } else {
      numeric += char;
    }
  }

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  const checkDigits = String(98 - remainder).padStart(2, '0');
  return `CZ${checkDigits}${bban}`;
}

export function buildSpdPayload(
  iban: string,
  amount: string,
  variableSymbol: string,
): string {
  return `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*X-VS:${variableSymbol}`;
}

export type InvoicePayment = {
  iban: string;
  /** Číslo účtu v českém formátu (prefix-číslo/kód banky). */
  bankAccount: string;
  amount: string;
  variableSymbol: string;
  spdPayload: string;
};

/** Platební údaje faktury pro QR platbu (PDF i zobrazení v aplikaci, CR-0062). */
export function invoicePayment(
  account: {
    bankAccountPrefix: string | null;
    bankAccountNumber: string;
    bankCode: string;
  },
  amount: string,
  variableSymbol: string,
): InvoicePayment {
  const iban = toCzIban(
    account.bankAccountPrefix,
    account.bankAccountNumber,
    account.bankCode,
  );
  const number = account.bankAccountPrefix
    ? `${account.bankAccountPrefix}-${account.bankAccountNumber}`
    : account.bankAccountNumber;
  return {
    iban,
    bankAccount: `${number}/${account.bankCode}`,
    amount,
    variableSymbol,
    spdPayload: buildSpdPayload(iban, amount, variableSymbol),
  };
}
