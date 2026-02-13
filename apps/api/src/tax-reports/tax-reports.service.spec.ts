import { ForbiddenException } from '@nestjs/common';
import { TaxReportsService } from './tax-reports.service';

describe('TaxReportsService', () => {
  const prisma = {
    subject: {
      findUnique: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    taxReportRun: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const config = {
    get: jest.fn((key: string) => {
      if (key.includes('XML_SCHEMA')) {
        return 'current';
      }
      return undefined;
    }),
  } as any;

  const service = new TaxReportsService(prisma, config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects preview for non-vat payer subject', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1', isVatPayer: false });

    await expect(
      service.preview('user-1', {
        reportType: 'vat_return',
        periodType: 'month',
        year: 2026,
        value: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns preview payload for vat payer', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1', isVatPayer: true });
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        status: 'issued',
        invoiceNumber: '20260001',
        taxableSupplyDate: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
        taxClassification: 'domestic_standard',
        customerDic: null,
        totalWithoutVat: 100,
        totalVat: 21,
        totalWithVat: 121,
        items: [
          {
            position: 1,
            description: 'Test',
            vatRate: 21,
            lineTotalWithoutVat: 100,
            lineVatAmount: 21,
            lineTotalWithVat: 121,
          },
        ],
      },
    ]);

    const result = await service.preview('user-1', {
      reportType: 'vat_return',
      periodType: 'month',
      year: 2026,
      value: 1,
    });

    expect(result.invoiceCount).toBe(1);
    expect(result.reportType).toBe('vat_return');
    expect(result.datasetHash).toBeTruthy();
  });
});
