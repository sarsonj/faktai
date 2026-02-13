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
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
      firstName: 'Jindrich',
      lastName: 'Sarson',
      street: 'Zerotinova 510',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      dic: 'CZ7705203044',
    });
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

  it('exports VAT return in FU structure', async () => {
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
      firstName: 'Jindrich',
      lastName: 'Sarson',
      street: 'Zerotinova 510',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      dic: 'CZ7705203044',
    });
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        status: 'issued',
        invoiceNumber: '1025',
        taxableSupplyDate: new Date('2025-10-31T00:00:00.000Z'),
        updatedAt: new Date('2025-10-31T00:00:00.000Z'),
        taxClassification: 'domestic_standard',
        customerDic: 'CZ24755851',
        customerIco: '24755851',
        totalWithoutVat: 119804.36,
        totalVat: 25158.92,
        totalWithVat: 144963.28,
        items: [
          {
            position: 1,
            description: 'Test',
            vatRate: 21,
            lineTotalWithoutVat: 119804.36,
            lineVatAmount: 25158.92,
            lineTotalWithVat: 144963.28,
          },
        ],
      },
    ]);
    prisma.taxReportRun.findFirst.mockResolvedValue(null);
    prisma.taxReportRun.create.mockResolvedValue({ id: 'run-1' });

    const result = await service.export('user-1', {
      reportType: 'vat_return',
      periodType: 'quarter',
      year: 2025,
      value: 4,
    });

    expect(result.xml).toContain('<Pisemnost');
    expect(result.xml).toContain('<DPHDP3');
    expect(result.xml).toContain('<Veta1');
    expect(result.fileName).toContain('dph-priznani-2025-Q4-v1.xml');
  });

  it('exports control statement in FU structure', async () => {
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
      firstName: 'Jindrich',
      lastName: 'Sarson',
      street: 'Zerotinova 510',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      dic: 'CZ7705203044',
    });
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        status: 'issued',
        invoiceNumber: '1025',
        taxableSupplyDate: new Date('2025-10-31T00:00:00.000Z'),
        updatedAt: new Date('2025-10-31T00:00:00.000Z'),
        taxClassification: 'domestic_standard',
        customerDic: 'CZ24755851',
        customerIco: '24755851',
        totalWithoutVat: 119804.36,
        totalVat: 25158.92,
        totalWithVat: 144963.28,
        items: [
          {
            position: 1,
            description: 'Test',
            vatRate: 21,
            lineTotalWithoutVat: 119804.36,
            lineVatAmount: 25158.92,
            lineTotalWithVat: 144963.28,
          },
        ],
      },
    ]);
    prisma.taxReportRun.findFirst.mockResolvedValue(null);
    prisma.taxReportRun.create.mockResolvedValue({ id: 'run-2' });

    const result = await service.export('user-1', {
      reportType: 'control_statement',
      periodType: 'quarter',
      year: 2025,
      value: 4,
    });

    expect(result.xml).toContain('<DPHKH1');
    expect(result.xml).toContain('<VetaA4');
    expect(result.xml).toContain('<VetaC');
    expect(result.fileName).toContain('kontrolni-hlaseni-2025-Q4-v1.xml');
  });
});
