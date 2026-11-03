import { BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { TaxReportsService } from './tax-reports.service';

type Attrs = Record<string, string>;

const subject = {
  id: 'subject-1',
  isVatPayer: true,
  firstName: 'Jan',
  lastName: 'Novak',
  street: 'Zerotinova 510/12',
  city: 'Horice',
  postalCode: '50801',
  countryCode: 'CZ',
  ico: '77052030',
  dic: 'CZ7705203044',
  taxOfficePracufo: '2705',
  contactPhone: '+420 777 604 080',
  contactEmail: 'fu@example.cz',
};

let seq = 0;
function invoice(
  classification: string,
  items: Array<{ rate: number; base: string; vat: string }>,
  extra: Record<string, unknown> = {},
) {
  seq += 1;
  const base = items.reduce((sum, item) => sum + Number(item.base), 0);
  const vat = items.reduce((sum, item) => sum + Number(item.vat), 0);
  return {
    id: `inv-${seq}`,
    status: 'issued',
    invoiceNumber: `2026${String(seq).padStart(6, '0')}`,
    taxableSupplyDate: new Date('2026-01-15T00:00:00.000Z'),
    updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    taxClassification: classification,
    reverseChargeCode: null,
    customerName: `Customer ${seq}`,
    customerDic: 'CZ24755851',
    customerIco: '24755851',
    supplierSnapshot: { isVatPayer: true },
    totalWithoutVat: base.toFixed(2),
    totalVat: vat.toFixed(2),
    totalWithVat: (base + vat).toFixed(2),
    items: items.map((item, index) => ({
      position: index + 1,
      description: 'Item',
      vatRate: item.rate,
      lineTotalWithoutVat: item.base,
      lineVatAmount: item.vat,
      lineTotalWithVat: (Number(item.base) + Number(item.vat)).toFixed(2),
    })),
    ...extra,
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  isArray: (name) => name === 'VetaA1' || name === 'VetaA4',
});

describe('TaxReportsService – mapping to FU rows', () => {
  const prisma = {
    subject: { findUnique: jest.fn() },
    invoice: { findMany: jest.fn() },
  } as any;
  const config = { get: jest.fn(() => undefined) } as any;
  const taxOfficesService = {
    findByPracufo: jest.fn().mockReturnValue({ pracufo: '2705' }),
    resolveParentUfoByPracufo: jest.fn().mockReturnValue('458'),
  } as any;
  const service = new TaxReportsService(prisma, config, taxOfficesService);
  const request = (reportType: 'vat_return' | 'control_statement') => ({
    reportType,
    periodType: 'month' as const,
    year: 2026,
    value: 1,
  });

  beforeEach(() => {
    prisma.subject.findUnique.mockResolvedValue(subject);
  });

  it('maps every VAT regime to the correct DP3 row (XSD-valid)', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      invoice('domestic_standard', [
        { rate: 21, base: '1000.00', vat: '210.00' },
        { rate: 12, base: '500.00', vat: '60.00' },
      ]),
      invoice('eu_service', [{ rate: 0, base: '2000.00', vat: '0.00' }]),
      invoice('eu_goods', [{ rate: 0, base: '3000.00', vat: '0.00' }]),
      invoice('export_third_country', [{ rate: 0, base: '4000.00', vat: '0.00' }]),
      invoice('domestic_reverse_charge', [{ rate: 0, base: '5000.00', vat: '0.00' }], {
        reverseChargeCode: '4',
      }),
      invoice('exempt_without_credit', [{ rate: 0, base: '600.00', vat: '0.00' }]),
    ]);

    const { xml } = await service.export('user-1', request('vat_return'));
    const dp3 = parser.parse(xml).Pisemnost.DPHDP3;
    const veta1: Attrs = dp3.Veta1;
    const veta2: Attrs = dp3.Veta2;

    // ř. 1, 2 – tuzemské plnění
    expect(veta1.obrat23).toBe('1000');
    expect(veta1.dan23).toBe('210');
    expect(veta1.obrat5).toBe('500');
    expect(veta1.dan5).toBe('60');
    // ř. 3 (pořízení z EU) a ř. 10/11 (příjemce v režimu přenesení) jsou vstupní řádky
    expect(veta1.p_zb23).toBe('0');
    expect(veta1.rez_pren23).toBe('0');
    expect(veta1.rez_pren5).toBe('0');
    // ř. 20, 21, 22, 25
    expect(veta2.dod_zb).toBe('3000');
    expect(veta2.pln_sluzby).toBe('2000');
    expect(veta2.pln_vyvoz).toBe('4000');
    expect(veta2.pln_rez_pren).toBe('5000');
    // ř. 50
    expect(dp3.Veta5.plnosv_kf).toBe('600');
    // ř. 62 / 64
    expect(dp3.Veta6.dan_zocelk).toBe('270');
    expect(dp3.Veta6.dano_da).toBe('270');
    // prázdné typované atributy se nevypisují
    expect(xml).not.toContain('c_okec=""');
    expect(dp3.VetaP.c_telef).toBe('+420777604080');
  });

  it('computes row 62 as sum of rounded rows', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      invoice('domestic_standard', [
        { rate: 21, base: '2.38', vat: '0.50' },
        { rate: 12, base: '4.17', vat: '0.50' },
      ]),
    ]);
    const { xml } = await service.export('user-1', request('vat_return'));
    const dp3 = parser.parse(xml).Pisemnost.DPHDP3;
    // 0.50 -> 1, 0.50 -> 1 => 2 (ne round(1.00) = 1)
    expect(dp3.Veta1.dan23).toBe('1');
    expect(dp3.Veta1.dan5).toBe('1');
    expect(dp3.Veta6.dan_zocelk).toBe('2');
  });

  it('splits control statement into A1, A4, A5 (XSD-valid)', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      // A.4 – plátce, nad 10 000 Kč, smíšené sazby
      invoice('domestic_standard', [
        { rate: 21, base: '10000.00', vat: '2100.00' },
        { rate: 12, base: '1000.00', vat: '120.00' },
      ]),
      // A.5 – plátce, do 10 000 Kč
      invoice('domestic_standard', [{ rate: 21, base: '1000.00', vat: '210.00' }]),
      // A.5 – odběratel bez DIČ, i nad 10 000 Kč
      invoice('domestic_standard', [{ rate: 21, base: '50000.00', vat: '10500.00' }], {
        customerDic: null,
        customerIco: '12345678',
      }),
      // A.1 – režim přenesení
      invoice('domestic_reverse_charge', [{ rate: 0, base: '8000.00', vat: '0.00' }], {
        reverseChargeCode: '4',
      }),
      // EU – v KH se neuvádí
      invoice('eu_service', [{ rate: 0, base: '7000.00', vat: '0.00' }], {
        customerDic: 'DE123456789',
      }),
    ]);

    const { xml } = await service.export('user-1', request('control_statement'));
    const kh = parser.parse(xml).Pisemnost.DPHKH1;

    expect(kh.VetaA1).toHaveLength(1);
    expect(kh.VetaA1[0]).toMatchObject({
      dic_odb: '24755851',
      zakl_dane1: '8000.00',
      kod_pred_pl: '4',
      duzp: '15.01.2026',
    });

    expect(kh.VetaA4).toHaveLength(1);
    expect(kh.VetaA4[0]).toMatchObject({
      dic_odb: '24755851',
      zakl_dane1: '10000.00',
      dan1: '2100.00',
      zakl_dane2: '1000.00',
      dan2: '120.00',
      dppd: '15.01.2026',
    });

    expect(kh.VetaA5).toMatchObject({
      zakl_dane1: '51000.00',
      dan1: '10710.00',
    });

    expect(kh.VetaC).toMatchObject({
      obrat23: '61000.00',
      obrat5: '1000.00',
      pln_rez_pren: '8000.00',
      rez_pren23: '0',
    });

    const order = ['<VetaA1', '<VetaA4', '<VetaA5', '<VetaC'].map((tag) =>
      xml.indexOf(tag),
    );
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // IČO se nikdy nepoužije místo DIČ
    expect(xml).not.toContain('dic_odb="12345678"');
  });

  it('rejects domestic standard invoice with 0 % rate', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      invoice('domestic_standard', [{ rate: 0, base: '100.00', vat: '0.00' }]),
    ]);
    await expect(service.export('user-1', request('vat_return'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects reverse charge invoice without subject code in KH', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      invoice('domestic_reverse_charge', [{ rate: 0, base: '100.00', vat: '0.00' }]),
    ]);
    await expect(
      service.export('user-1', request('control_statement')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignores invoices issued while supplier was not a VAT payer', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      invoice('domestic_standard', [{ rate: 21, base: '1000.00', vat: '210.00' }]),
      invoice('domestic_standard', [{ rate: 0, base: '999.00', vat: '0.00' }], {
        supplierSnapshot: { isVatPayer: false },
      }),
    ]);
    const { xml } = await service.export('user-1', request('vat_return'));
    expect(parser.parse(xml).Pisemnost.DPHDP3.Veta1.obrat23).toBe('1000');
  });
});
