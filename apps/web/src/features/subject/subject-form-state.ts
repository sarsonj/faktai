import { findBankByCode, normalizeBankCode } from '../../bank-codes';
import type { SubjectInput, SubjectProfile } from '../../types';

// Stav a validace formuláře subjektu – sdílené nastavením i onboardingem.

export type SubjectFormState = {
  firstName: string;
  lastName: string;
  businessName: string;
  ico: string;
  dic: string;
  isVatPayer: boolean;
  vatPeriodType: 'month' | 'quarter';
  vatRegistrationDate: string;
  taxOfficePracufo: string;
  contactPhone: string;
  contactEmail: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix: string;
  bankAccountNumber: string;
  bankCode: string;
  defaultDueDays: string;
};

export type SubjectPatch = (patch: Partial<SubjectFormState>) => void;

export function toInitialState(initial?: SubjectProfile, contactEmail?: string): SubjectFormState {
  return {
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    businessName: initial?.businessName ?? '',
    ico: initial?.ico ?? '',
    dic: initial?.dic ?? '',
    isVatPayer: initial?.isVatPayer ?? false,
    vatPeriodType: initial?.vatPeriodType ?? 'quarter',
    vatRegistrationDate: initial?.vatRegistrationDate?.slice(0, 10) ?? '',
    taxOfficePracufo: initial?.taxOfficePracufo ?? '',
    contactPhone: initial?.contactPhone ?? '',
    contactEmail: initial?.contactEmail ?? contactEmail ?? '',
    street: initial?.street ?? '',
    city: initial?.city ?? '',
    postalCode: initial?.postalCode ?? '',
    countryCode: initial?.countryCode ?? 'CZ',
    bankAccountPrefix: initial?.bankAccountPrefix ?? '',
    bankAccountNumber: initial?.bankAccountNumber ?? '',
    bankCode: initial?.bankCode ?? '',
    defaultDueDays: String(initial?.defaultDueDays ?? 14),
  };
}

export function toSubjectInput(state: SubjectFormState): SubjectInput {
  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    businessName: state.businessName.trim() || undefined,
    ico: state.ico.trim(),
    dic: state.dic.trim() || undefined,
    isVatPayer: state.isVatPayer,
    vatPeriodType: state.vatPeriodType,
    vatRegistrationDate: state.isVatPayer ? state.vatRegistrationDate || undefined : undefined,
    taxOfficePracufo: state.isVatPayer ? state.taxOfficePracufo || undefined : undefined,
    contactPhone: state.contactPhone.trim() || undefined,
    contactEmail: state.contactEmail.trim() || undefined,
    street: state.street.trim(),
    city: state.city.trim(),
    postalCode: state.postalCode.trim(),
    countryCode: state.countryCode.trim(),
    bankAccountPrefix: state.bankAccountPrefix.trim() || undefined,
    bankAccountNumber: state.bankAccountNumber.trim(),
    bankCode: normalizeBankCode(state.bankCode),
    defaultVariableSymbolType: 'ico',
    defaultVariableSymbolValue: undefined,
    defaultDueDays: Number(state.defaultDueDays),
  };
}

export function validateIdentity(state: SubjectFormState): string | null {
  if (!state.firstName.trim()) return 'Doplňte jméno.';
  if (!state.lastName.trim()) return 'Doplňte příjmení.';
  if (!/^\d{8}$/.test(state.ico.trim())) return 'IČO musí mít přesně 8 číslic.';
  return null;
}

export function validateAddress(state: SubjectFormState): string | null {
  if (!state.street.trim()) return 'Doplňte ulici.';
  if (!state.city.trim()) return 'Doplňte město.';
  if (!/^\d{5}$/.test(state.postalCode.trim())) return 'PSČ musí mít 5 číslic.';
  if (!/^[A-Z]{2}$/.test(state.countryCode.trim())) return 'Země musí být 2 písmena, např. CZ.';
  return null;
}

export function validateVatAndPayment(state: SubjectFormState): string | null {
  if (state.isVatPayer && !state.dic.trim()) return 'U plátce DPH je DIČ povinné.';
  if (state.isVatPayer && !state.vatRegistrationDate) return 'U plátce DPH doplňte datum registrace.';
  if (state.isVatPayer && !state.taxOfficePracufo) return 'U plátce DPH vyberte místní příslušnost finančního úřadu.';
  if (state.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contactEmail.trim())) {
    return 'E-mail pro FÚ není ve správném formátu.';
  }
  if (state.contactPhone.trim() && !/^[0-9+()\-\s]{6,25}$/.test(state.contactPhone.trim())) {
    return 'Telefon pro FÚ může obsahovat pouze číslice, mezery a znaky + ( ) -.';
  }
  if (!state.bankAccountNumber.trim()) return 'Doplňte číslo bankovního účtu.';
  const bankCode = normalizeBankCode(state.bankCode);
  if (bankCode.length !== 4) return 'Kód banky musí mít 4 číslice.';
  if (!findBankByCode(bankCode)) return 'Kód banky není v aktuálním číselníku ČNB.';
  const dueDays = Number(state.defaultDueDays);
  if (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > 90) {
    return 'Splatnost musí být celé číslo v rozsahu 1 až 90 dní.';
  }
  return null;
}

export function validateAll(state: SubjectFormState): string | null {
  return validateIdentity(state) ?? validateAddress(state) ?? validateVatAndPayment(state);
}
