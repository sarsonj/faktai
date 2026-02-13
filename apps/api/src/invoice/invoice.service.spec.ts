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
    $queryRaw: jest.fn(),
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;

  const service = new InvoiceService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty list when user has no subject', async () => {
    prisma.subject.findUnique.mockResolvedValue(null);
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.listInvoices('user-1', {
      status: 'all',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.availableYears).toEqual([]);
  });

  it('maps issued invoice older than today as overdue', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.$queryRaw.mockResolvedValue([{ year: 2026 }, { year: 2025 }]);
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
        items: [{ description: 'Servisní balíček' }],
      },
    ]);

    const result = await service.listInvoices('user-1', {
      status: 'all',
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0].status).toBe('overdue');
    expect(result.items[0].description).toBe('Servisní balíček');
    expect(result.availableYears).toEqual([2026, 2025]);
  });

  it('filters list by selected year', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.$queryRaw.mockResolvedValue([{ year: 2026 }, { year: 2025 }]);
    prisma.invoice.count.mockResolvedValue(0);
    prisma.invoice.findMany.mockResolvedValue([]);

    await service.listInvoices('user-1', {
      status: 'all',
      page: 1,
      pageSize: 10,
      year: 2025,
    });

    expect(prisma.invoice.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          issueDate: expect.objectContaining({
            gte: new Date(Date.UTC(2025, 0, 1)),
            lt: new Date(Date.UTC(2026, 0, 1)),
          }),
        }),
      }),
    );
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          items: expect.objectContaining({
            select: { description: true },
            orderBy: { position: 'asc' },
            take: 1,
          }),
        }),
      }),
    );
  });
});
