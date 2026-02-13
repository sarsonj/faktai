import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  const prisma = {
    subject: {
      findUnique: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;

  const service = new InvoiceService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty list when user has no subject', async () => {
    prisma.subject.findUnique.mockResolvedValue(null);

    const result = await service.listInvoices('user-1', {
      status: 'all',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('maps issued invoice older than today as overdue', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.invoice.count.mockResolvedValue(1);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: '20260001',
        status: 'issued',
        customerName: 'Acme',
        issueDate: new Date('2026-01-01T00:00:00.000Z'),
        dueDate: new Date('2026-01-10T00:00:00.000Z'),
        totalWithoutVat: 100,
        totalWithVat: 121,
        paidAt: null,
        note: 'Test',
      },
    ]);

    const result = await service.listInvoices('user-1', {
      status: 'all',
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0].status).toBe('overdue');
  });
});
