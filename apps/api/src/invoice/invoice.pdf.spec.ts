import { Prisma } from '@prisma/client';
import { InvoiceService } from './invoice.service';
import { InvoicePdfRenderer } from './pdf/invoice-pdf.renderer';

function buildInvoice(
  itemCount: number,
  overrides: Record<string, unknown> = {},
  isVatPayer = true,
) {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `item-${index + 1}`,
    invoiceId: 'inv-1',
    position: index + 1,
    description: `Položka ${index + 1}`,
    quantity: new Prisma.Decimal('1.000'),
    unit: 'ks',
    unitPrice: new Prisma.Decimal('100.00'),
    vatRate: 21,
    lineTotalWithoutVat: new Prisma.Decimal('100.00'),
    lineVatAmount: new Prisma.Decimal('21.00'),
    lineTotalWithVat: new Prisma.Decimal('121.00'),
  }));
  const subject = {
    id: 'subject-1',
    firstName: 'Jan',
    lastName: 'Novák',
    businessName: null,
    ico: '12345678',
    dic: 'CZ12345678',
    street: 'Dlouhá 1',
    city: 'Praha',
    postalCode: '11000',
    countryCode: 'CZ',
    bankAccountPrefix: null,
    bankAccountNumber: '123456789',
    bankCode: '0100',
    isVatPayer,
  };
  return {
    id: 'inv-1',
    subjectId: 'subject-1',
    status: 'issued',
    invoiceNumber: '2026000001',
    variableSymbol: '2026000001',
    issueDate: new Date('2026-11-03T00:00:00.000Z'),
    taxableSupplyDate: new Date('2026-11-03T00:00:00.000Z'),
    dueDate: new Date('2026-11-17T00:00:00.000Z'),
    paymentMethod: 'bank_transfer',
    taxClassification: 'domestic_standard',
    customerName: 'Acme s.r.o.',
    customerIco: '87654321',
    customerDic: 'CZ87654321',
    customerStreet: 'Krátká 2',
    customerCity: 'Brno',
    customerPostalCode: '60200',
    customerCountryCode: 'CZ',
    supplierSnapshot: null,
    note: null,
    totalWithoutVat: new Prisma.Decimal(100 * itemCount),
    totalVat: new Prisma.Decimal(21 * itemCount),
    totalWithVat: new Prisma.Decimal(121 * itemCount),
    pdfVersion: 0,
    pdfPayloadHash: null,
    paidAt: null,
    items,
    subject,
    ...overrides,
  };
}

function countPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
}

describe('InvoiceService PDF export', () => {
  async function exportWithItems(
    itemCount: number,
    overrides: Record<string, unknown> = {},
    isVatPayer = true,
  ): Promise<Buffer> {
    const invoice = buildInvoice(itemCount, overrides, isVatPayer);
    const tx = {
      invoice: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ pdfVersion: 0, pdfPayloadHash: null }),
        update: jest.fn(),
      },
      pdfExportMetadata: { create: jest.fn() },
    };
    const prisma = {
      subject: { findUnique: jest.fn().mockResolvedValue(invoice.subject) },
      invoice: { findFirst: jest.fn().mockResolvedValue(invoice) },
      $transaction: jest.fn(
        async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
      ),
    } as any;
    const service = new InvoiceService(prisma, new InvoicePdfRenderer());
    const result = await service.exportInvoicePdf('user-1', 'inv-1');
    return result.content;
  }

  it('renders a short invoice on a single page', async () => {
    const pdf = await exportWithItems(3);
    expect(countPages(pdf)).toBe(1);
  });

  it('renders all items of a long invoice across multiple pages', async () => {
    const pdf = await exportWithItems(80);
    expect(countPages(pdf)).toBeGreaterThanOrEqual(3);
  });

  it('renders a non-VAT-payer invoice', async () => {
    const pdf = await exportWithItems(3, {}, false);
    expect(countPages(pdf)).toBe(1);
  });

  it('renders a reverse charge invoice', async () => {
    const pdf = await exportWithItems(3, {
      taxClassification: 'domestic_reverse_charge',
      reverseChargeCode: '4',
    });
    expect(countPages(pdf)).toBe(1);
  });
});
