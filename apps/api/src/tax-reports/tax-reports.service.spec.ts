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
  } as any;

  const config = {
    get: jest.fn((key: string) => {
      if (key.includes('XML_SCHEMA')) {
        return 'current';
      }
      return undefined;
    }),
  } as any;

  const taxOfficesService = {
    findByPracufo: jest.fn(),
    resolveParentUfoByPracufo: jest.fn(),
  } as any;

  const service = new TaxReportsService(prisma, config, taxOfficesService);

  beforeEach(() => {
    jest.clearAllMocks();
    taxOfficesService.findByPracufo.mockReturnValue({
      pracufo: '2705',
      ufo: '239',
      name: 'Finanční úřad v Hořicích',
    });
    taxOfficesService.resolveParentUfoByPracufo.mockReturnValue('458');
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
      street: 'Zerotinova 510/12',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      ico: '77052030',
      dic: 'CZ7705203044',
      taxOfficePracufo: '2705',
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
      street: 'Zerotinova 510/12',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      ico: '77052030',
      dic: 'CZ7705203044',
      taxOfficePracufo: '2705',
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
    const result = await service.export('user-1', {
      reportType: 'vat_return',
      periodType: 'quarter',
      year: 2025,
      value: 4,
    });

    expect(result.xml).toContain('<Pisemnost');
    expect(result.xml).toContain('<DPHDP3');
    expect(result.xml).toContain('<Veta1');
    expect(result.xml).toContain('c_pop="510"');
    expect(result.xml).toContain('c_orient="12"');
    expect(result.xml).toContain('c_pracufo="2705"');
    expect(result.xml).toContain('c_ufo="458"');
    expect(result.fileName).toContain('77052030_DPH_20254Q.xml');
  });

  it('exports control statement in FU structure', async () => {
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
      firstName: 'Jindrich',
      lastName: 'Sarson',
      street: 'Zerotinova 510/12',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      ico: '77052030',
      dic: 'CZ7705203044',
      taxOfficePracufo: '2705',
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
    const result = await service.export('user-1', {
      reportType: 'control_statement',
      periodType: 'quarter',
      year: 2025,
      value: 4,
    });

    expect(result.xml).toContain('<DPHKH1');
    expect(result.xml).toContain('<VetaA4');
    expect(result.xml).toContain('<VetaC');
    expect(result.xml).toContain('c_pracufo="2705"');
    expect(result.xml).toContain('c_ufo="458"');
    expect(result.fileName).toContain('77052030_DPHKH_20254Q.xml');
  });

  it('rejects unsupported summary statement report type', async () => {
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
    });

    await expect(
      service.export('user-1', {
        reportType: 'summary_statement',
        periodType: 'quarter',
        year: 2025,
        value: 4,
      }),
    ).rejects.toThrow('Souhrnné hlášení není ve verzi v1 podporováno.');
  });

  it('rejects export when tax office assignment is missing', async () => {
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
      firstName: 'Jindrich',
      lastName: 'Sarson',
      street: 'Zerotinova 510/12',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      ico: '77052030',
      dic: 'CZ7705203044',
      taxOfficePracufo: null,
    });
    prisma.invoice.findMany.mockResolvedValue([]);

    await expect(
      service.export('user-1', {
        reportType: 'vat_return',
        periodType: 'quarter',
        year: 2025,
        value: 4,
      }),
    ).rejects.toThrow('Subjekt nemá vyplněnou místní příslušnost finančního úřadu.');
  });

  it('rejects export when parent tax office cannot be resolved', async () => {
    taxOfficesService.resolveParentUfoByPracufo.mockReturnValue(null);
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      isVatPayer: true,
      firstName: 'Jindrich',
      lastName: 'Sarson',
      street: 'Zerotinova 510/12',
      city: 'Horice',
      postalCode: '50801',
      countryCode: 'CZ',
      ico: '77052030',
      dic: 'CZ7705203044',
      taxOfficePracufo: '2705',
    });
    prisma.invoice.findMany.mockResolvedValue([]);

    await expect(
      service.export('user-1', {
        reportType: 'vat_return',
        periodType: 'quarter',
        year: 2025,
        value: 4,
      }),
    ).rejects.toThrow(
      'Pro místní příslušnost 2705 nebyl nalezen aktivní nadřazený finanční úřad.',
    );
  });
});
