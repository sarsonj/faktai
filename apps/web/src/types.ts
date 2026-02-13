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

export type InvoiceListStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';
export type PaymentMethod = 'bank_transfer';
export type TaxClassification =
  | 'domestic_standard'
  | 'domestic_reverse_charge'
  | 'eu_service'
  | 'eu_goods'
  | 'export_third_country'
  | 'exempt_without_credit';

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceListStatus;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalWithoutVat: string;
  totalWithVat: string;
  paidAt: string | null;
  description: string;
};

export type InvoiceListResponse = {
  items: InvoiceListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type InvoiceItem = {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
  lineTotalWithoutVat: string;
  lineVatAmount: string;
  lineTotalWithVat: string;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceListStatus;
  variableSymbol: string;
  issueDate: string;
  taxableSupplyDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  taxClassification: TaxClassification | null;
  customerName: string;
  customerIco: string | null;
  customerDic: string | null;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountryCode: string;
  note: string | null;
  totalWithoutVat: string;
  totalVat: string;
  totalWithVat: string;
  pdfVersion: number;
  paidAt: string | null;
  items: InvoiceItem[];
};

export type InvoiceItemInput = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
};

export type InvoiceUpsertInput = {
  variableSymbol?: string;
  issueDate?: string;
  taxableSupplyDate?: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  taxClassification?: TaxClassification;
  customerName: string;
  customerIco?: string;
  customerDic?: string;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountryCode: string;
  note?: string;
  items: InvoiceItemInput[];
};
