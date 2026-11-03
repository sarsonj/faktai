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
  vatPeriodType: 'month' | 'quarter';
  vatRegistrationDate: string | null;
  taxOfficePracufo: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
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
  vatPeriodType?: 'month' | 'quarter';
  vatRegistrationDate?: string;
  taxOfficePracufo?: string;
  contactPhone?: string;
  contactEmail?: string;
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

export type TaxOfficeOption = {
  pracufo: string;
  ufo: string;
  name: string;
};

export type RegistryCompanyResult = {
  name: string;
  ico: string;
  dic: string | null;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

export type RegistryAddressResult = {
  id: string;
  displayName: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
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
  year: number;
  availableYears: number[];
  statusCounts: InvoiceStatusCounts;
};

export type InvoiceListFilter = 'all' | 'draft' | 'unpaid' | 'overdue' | 'paid';

export type InvoiceStatusCounts = Record<InvoiceListFilter, number>;

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
  reverseChargeCode: string | null;
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
  supplierBankAccountPrefix: string | null;
  supplierBankAccountNumber: string;
  supplierBankCode: string;
  supplierIsVatPayer: boolean;
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
  invoiceNumber?: string;
  variableSymbol?: string;
  issueDate?: string;
  taxableSupplyDate?: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  taxClassification?: TaxClassification;
  reverseChargeCode?: string;
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

export type TaxReportType = 'vat_return' | 'control_statement';
export type TaxPeriodType = 'month' | 'quarter';

export type TaxReportRequest = {
  reportType: TaxReportType;
  periodType: TaxPeriodType;
  year: number;
  value: number;
};

export type TaxReportPreview = {
  reportType: TaxReportType;
  periodType: TaxPeriodType;
  year: number;
  value: number;
  schemaVersion: string;
  invoiceCount: number;
  datasetHash: string;
  summary: Record<string, unknown>;
};

// Přijaté doklady (CR-0060)
export type ReceivedVatRegime =
  | 'domestic_standard'
  | 'domestic_reverse_charge'
  | 'eu_goods'
  | 'eu_service'
  | 'no_deduction';

export type ReceivedDocumentLine = { vatRate: number; base: string; vat: string };

export type ReceivedDocumentAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export type ReceivedDocument = {
  id: string;
  documentNumber: string;
  supplierName: string;
  supplierIco: string | null;
  supplierVatId: string | null;
  supplierStreet: string | null;
  supplierCity: string | null;
  supplierPostalCode: string | null;
  supplierCountryCode: string;
  description: string | null;
  issueDate: string | null;
  taxableSupplyDate: string;
  deductionDate: string;
  dueDate: string | null;
  paidAt: string | null;
  vatRegime: ReceivedVatRegime;
  reverseChargeCode: string | null;
  totalWithoutVat: string;
  totalVat: string;
  totalPayable: string;
  note: string | null;
  lines: ReceivedDocumentLine[];
  attachments: ReceivedDocumentAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type ReceivedDocumentInput = {
  documentNumber: string;
  supplierName: string;
  supplierIco?: string;
  supplierVatId?: string;
  supplierStreet?: string;
  supplierCity?: string;
  supplierPostalCode?: string;
  supplierCountryCode?: string;
  description?: string;
  issueDate?: string;
  taxableSupplyDate: string;
  deductionDate?: string;
  dueDate?: string;
  paidAt?: string;
  vatRegime: ReceivedVatRegime;
  reverseChargeCode?: string;
  note?: string;
  lines: Array<{ vatRate: number; base: string; vat?: string }>;
};

export type ReceivedDocumentListResponse = {
  items: ReceivedDocument[];
  total: number;
  page: number;
  pageSize: number;
  year: number;
  availableYears: number[];
};
