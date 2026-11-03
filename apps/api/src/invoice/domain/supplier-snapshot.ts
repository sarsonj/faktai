import { Invoice, Subject } from '@prisma/client';

// Snapshot dodavatele uložený na vystavené faktuře (údaje platné v okamžiku vystavení).

export type SupplierSnapshot = {
  firstName: string;
  lastName: string;
  businessName: string | null;
  ico: string;
  dic: string | null;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix: string | null;
  bankAccountNumber: string;
  bankCode: string;
  isVatPayer: boolean;
};

export function buildSupplierSnapshot(subject: Subject): SupplierSnapshot {
  return {
    firstName: subject.firstName,
    lastName: subject.lastName,
    businessName: subject.businessName,
    ico: subject.ico,
    dic: subject.dic,
    street: subject.street,
    city: subject.city,
    postalCode: subject.postalCode,
    countryCode: subject.countryCode,
    bankAccountPrefix: subject.bankAccountPrefix,
    bankAccountNumber: subject.bankAccountNumber,
    bankCode: subject.bankCode,
    isVatPayer: subject.isVatPayer,
  };
}

/** Snapshot z faktury; chybějící pole doplní z aktuálního subjektu (starší data). */
export function resolveSupplierSnapshot(
  invoice: Invoice & { subject: Subject },
): SupplierSnapshot {
  const raw = invoice.supplierSnapshot;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return buildSupplierSnapshot(invoice.subject);
  }

  const snapshot = raw as Record<string, unknown>;
  const fallback = buildSupplierSnapshot(invoice.subject);

  return {
    firstName:
      typeof snapshot.firstName === 'string'
        ? snapshot.firstName
        : fallback.firstName,
    lastName:
      typeof snapshot.lastName === 'string'
        ? snapshot.lastName
        : fallback.lastName,
    businessName:
      typeof snapshot.businessName === 'string'
        ? snapshot.businessName
        : fallback.businessName,
    ico: typeof snapshot.ico === 'string' ? snapshot.ico : fallback.ico,
    dic: typeof snapshot.dic === 'string' ? snapshot.dic : fallback.dic,
    street:
      typeof snapshot.street === 'string' ? snapshot.street : fallback.street,
    city: typeof snapshot.city === 'string' ? snapshot.city : fallback.city,
    postalCode:
      typeof snapshot.postalCode === 'string'
        ? snapshot.postalCode
        : fallback.postalCode,
    countryCode:
      typeof snapshot.countryCode === 'string'
        ? snapshot.countryCode
        : fallback.countryCode,
    bankAccountPrefix:
      typeof snapshot.bankAccountPrefix === 'string'
        ? snapshot.bankAccountPrefix
        : fallback.bankAccountPrefix,
    bankAccountNumber:
      typeof snapshot.bankAccountNumber === 'string'
        ? snapshot.bankAccountNumber
        : fallback.bankAccountNumber,
    bankCode:
      typeof snapshot.bankCode === 'string'
        ? snapshot.bankCode
        : fallback.bankCode,
    isVatPayer:
      typeof snapshot.isVatPayer === 'boolean'
        ? snapshot.isVatPayer
        : fallback.isVatPayer,
  };
}
