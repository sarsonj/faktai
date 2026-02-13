export type MeResponse = {
  id: string;
  email: string;
  hasSubject: boolean;
};

export type DefaultVariableSymbolType = 'ico' | 'custom';

export type SubjectProfile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  ico: string;
  dic: string | null;
  isVatPayer: boolean;
  vatRegistrationDate: string | null;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix: string | null;
  bankAccountNumber: string;
  bankCode: string;
  defaultVariableSymbolType: DefaultVariableSymbolType;
  defaultVariableSymbolValue: string | null;
  defaultDueDays: number;
  createdAt: string;
  updatedAt: string;
};

export type SubjectInput = {
  firstName: string;
  lastName: string;
  businessName?: string;
  ico: string;
  dic?: string;
  isVatPayer: boolean;
  vatRegistrationDate?: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix?: string;
  bankAccountNumber: string;
  bankCode: string;
  defaultVariableSymbolType: DefaultVariableSymbolType;
  defaultVariableSymbolValue?: string;
  defaultDueDays: number;
};
