import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  Subject,
  TaxPeriodType,
  TaxReportType,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
import { XMLBuilder, XMLValidator } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import { TaxOfficesService } from '../tax-offices/tax-offices.service';
import { TaxReportRequestDto } from './dto/tax-report-request.dto';

type InvoiceWithItems = Prisma.InvoiceGetPayload<{
  include: {
    items: true;
  };
}>;

type PeriodRange = {
  start: Date;
  endExclusive: Date;
};

type TaxPreviewResult = {
  reportType: TaxReportType;
  periodType: TaxPeriodType;
  year: number;
  value: number;
  schemaVersion: string;
  invoiceCount: number;
  datasetHash: string;
  summary: Record<string, unknown>;
};

type VatFigures = {
  base21: Decimal;
  vat21: Decimal;
  base12: Decimal;
  vat12: Decimal;
  base0: Decimal;
  vat0: Decimal;
  reverse21: Decimal;
  reverse12: Decimal;
};

@Injectable()
export class TaxReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly taxOfficesService: TaxOfficesService,
  ) {}

  private normalizePeriod(dto: TaxReportRequestDto): TaxReportRequestDto {
    if (dto.periodType === 'month' && (dto.value < 1 || dto.value > 12)) {
      throw new BadRequestException('Pro měsíční období musí být hodnota 1-12.');
    }

    if (dto.periodType === 'quarter' && (dto.value < 1 || dto.value > 4)) {
      throw new BadRequestException('Pro čtvrtletní období musí být hodnota 1-4.');
    }

    return dto;
  }

  private ensureSupportedReportType(reportType: TaxReportType): void {
    if (reportType === 'summary_statement') {
      throw new BadRequestException('Souhrnné hlášení není ve verzi v1 podporováno.');
    }
  }

  private resolvePeriodRange(dto: TaxReportRequestDto): PeriodRange {
    if (dto.periodType === 'month') {
      const start = new Date(Date.UTC(dto.year, dto.value - 1, 1));
      const endExclusive = new Date(Date.UTC(dto.year, dto.value, 1));
      return { start, endExclusive };
    }

    const quarterStartMonth = (dto.value - 1) * 3;
    const start = new Date(Date.UTC(dto.year, quarterStartMonth, 1));
    const endExclusive = new Date(Date.UTC(dto.year, quarterStartMonth + 3, 1));
    return { start, endExclusive };
  }

  private async getSubjectByUserOrThrow(userId: string): Promise<Subject> {
    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      throw new NotFoundException('Subjekt nebyl nalezen.');
    }

    return subject;
  }

  private assertVatPayer(subject: Subject): void {
    if (!subject.isVatPayer) {
      throw new ForbiddenException('Subjekt není plátce DPH');
    }
  }

  private async getInvoicesForPeriod(subjectId: string, range: PeriodRange) {
    return this.prisma.invoice.findMany({
      where: {
        subjectId,
        status: {
          in: ['issued', 'paid'],
        },
        taxableSupplyDate: {
          gte: range.start,
          lt: range.endExclusive,
        },
      },
      include: {
        items: true,
      },
      orderBy: [
        {
          taxableSupplyDate: 'asc',
        },
        {
          invoiceNumber: 'asc',
        },
      ],
    });
  }

  private computeDatasetHash(invoices: InvoiceWithItems[]): string {
    const payload = invoices.map((invoice) => ({
      id: invoice.id,
      updatedAt: invoice.updatedAt.toISOString(),
      status: invoice.status,
      invoiceNumber: invoice.invoiceNumber,
      taxableSupplyDate: invoice.taxableSupplyDate.toISOString(),
      taxClassification: invoice.taxClassification,
      customerDic: invoice.customerDic,
      totalWithoutVat: invoice.totalWithoutVat.toString(),
      totalVat: invoice.totalVat.toString(),
      totalWithVat: invoice.totalWithVat.toString(),
      items: invoice.items
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          description: item.description,
          vatRate: item.vatRate,
          lineTotalWithoutVat: item.lineTotalWithoutVat.toString(),
          lineVatAmount: item.lineVatAmount.toString(),
          lineTotalWithVat: item.lineTotalWithVat.toString(),
        })),
    }));

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private ensureClassifications(invoices: InvoiceWithItems[]): void {
    const missing = invoices.find((invoice) => !invoice.taxClassification);
    if (missing) {
      throw new BadRequestException('Některé faktury nemají vyplněnou daňovou klasifikaci');
    }
  }

  private buildVatReturnSummary(invoices: InvoiceWithItems[]) {
    const rates: Record<0 | 12 | 21, { base: Decimal; vat: Decimal }> = {
      0: { base: new Decimal(0), vat: new Decimal(0) },
      12: { base: new Decimal(0), vat: new Decimal(0) },
      21: { base: new Decimal(0), vat: new Decimal(0) },
    };

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        if (item.vatRate !== 0 && item.vatRate !== 12 && item.vatRate !== 21) {
          continue;
        }

        rates[item.vatRate].base = rates[item.vatRate].base.add(
          item.lineTotalWithoutVat.toString(),
        );
        rates[item.vatRate].vat = rates[item.vatRate].vat.add(
          item.lineVatAmount.toString(),
        );
      }
    }

    return {
      rates: {
        zero: {
          base: rates[0].base.toFixed(2),
          vat: rates[0].vat.toFixed(2),
        },
        reduced: {
          base: rates[12].base.toFixed(2),
          vat: rates[12].vat.toFixed(2),
        },
        standard: {
          base: rates[21].base.toFixed(2),
          vat: rates[21].vat.toFixed(2),
        },
      },
      totals: {
        base: rates[0].base.add(rates[12].base).add(rates[21].base).toFixed(2),
        vat: rates[0].vat.add(rates[12].vat).add(rates[21].vat).toFixed(2),
      },
    };
  }

  private buildControlStatementSummary(invoices: InvoiceWithItems[]) {
    const domesticInvoices = invoices.filter((invoice) =>
      invoice.taxClassification === 'domestic_standard' ||
      invoice.taxClassification === 'domestic_reverse_charge',
    );

    return {
      entries: domesticInvoices.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerDic: invoice.customerDic,
        classification: invoice.taxClassification,
        totalWithVat: invoice.totalWithVat.toString(),
      })),
      invoiceCount: domesticInvoices.length,
    };
  }

  private getSchemaVersion(reportType: TaxReportType): string {
    const byType: Record<'vat_return' | 'control_statement', string> = {
      vat_return: this.config.get<string>('XML_SCHEMA_DPH_VERSION') ?? 'current',
      control_statement:
        this.config.get<string>('XML_SCHEMA_KH_VERSION') ?? 'current',
    };

    const whitelist = new Set(['current', 'v1']);
    const selectedVersion =
      reportType === 'vat_return'
        ? byType.vat_return
        : byType.control_statement;

    if (!whitelist.has(selectedVersion)) {
      throw new BadRequestException(`Unsupported XML schema version: ${selectedVersion}`);
    }

    return selectedVersion;
  }

  private formatDateForFu(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}.${month}.${year}`;
  }

  private formatDecimal(value: Decimal.Value): string {
    return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  }

  private formatWhole(value: Decimal.Value): string {
    return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0);
  }

  private normalizeVatId(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.replace(/\s+/g, '').toUpperCase().replace(/^CZ/, '');
  }

  private toFuAttributes(values: Record<string, string>): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      attrs[`@_${key}`] = value;
    }
    return attrs;
  }

  private buildFuVetaD(
    request: TaxReportRequestDto,
    document: 'DP3' | 'KH1',
    formFieldName: 'dapdph_forma' | 'khdph_forma',
    extraFields: Record<string, string> = {},
  ) {
    const periodFields: Record<string, string> = {
      [formFieldName]: request.periodType === 'month' ? 'A' : 'B',
    };
    if (request.periodType === 'month') {
      periodFields.mesic = String(request.value);
    } else {
      periodFields.ctvrt = String(request.value);
    }

    return this.toFuAttributes({
      k_uladis: 'DPH',
      d_poddp: this.formatDateForFu(new Date()),
      rok: String(request.year),
      dokument: document,
      ...periodFields,
      ...extraFields,
    });
  }

  private buildFuVetaP(subject: Subject) {
    const { streetName, buildingNumber, orientationNumber } =
      this.parseStreetForFu(subject.street);
    const taxOffice = this.resolveTaxOfficeForSubject(subject);

    return this.toFuAttributes({
      c_orient: orientationNumber,
      c_pop: buildingNumber,
      c_pracufo: taxOffice.pracufo,
      c_ufo: taxOffice.ufo,
      dic: this.normalizeVatId(subject.dic),
      jmeno: subject.firstName,
      prijmeni: subject.lastName,
      naz_obce: subject.city,
      psc: subject.postalCode,
      stat: subject.countryCode === 'CZ' ? 'Česká republika' : subject.countryCode,
      ulice: streetName,
      sest_jmeno: subject.firstName,
      sest_prijmeni: subject.lastName,
      sest_telef: subject.contactPhone ?? '',
      typ_ds: 'F',
      c_telef: subject.contactPhone ?? '',
      email: subject.contactEmail ?? '',
    });
  }

  private parseStreetForFu(street: string): {
    streetName: string;
    buildingNumber: string;
    orientationNumber: string;
  } {
    const normalized = street.trim().replace(/\s+/g, ' ');

    const slashMatch = normalized.match(
      /^(.*\S)\s+([0-9]+[A-Za-z]?)\s*\/\s*([0-9]+[A-Za-z]?)$/u,
    );
    if (slashMatch) {
      return {
        streetName: slashMatch[1].replace(/[,\s]+$/u, ''),
        buildingNumber: slashMatch[2],
        orientationNumber: slashMatch[3],
      };
    }

    const singleNumberMatch = normalized.match(/^(.*\S)\s+([0-9]+[A-Za-z]?)$/u);
    if (singleNumberMatch) {
      return {
        streetName: singleNumberMatch[1].replace(/[,\s]+$/u, ''),
        buildingNumber: singleNumberMatch[2],
        orientationNumber: '',
      };
    }

    return {
      streetName: normalized,
      buildingNumber: '',
      orientationNumber: '',
    };
  }

  private resolveTaxOfficeForSubject(subject: Subject) {
    const pracufo = subject.taxOfficePracufo?.trim();
    if (!pracufo) {
      throw new BadRequestException(
        'Subjekt nemá vyplněnou místní příslušnost finančního úřadu.',
      );
    }

    const selectedOffice = this.taxOfficesService.findByPracufo(pracufo);
    if (!selectedOffice) {
      throw new BadRequestException(
        `Místní příslušnost finančního úřadu ${pracufo} nebyla v číselníku nalezena.`,
      );
    }

    const parentUfo = this.taxOfficesService.resolveParentUfoByPracufo(pracufo);
    if (!parentUfo) {
      throw new BadRequestException(
        `Pro místní příslušnost ${pracufo} nebyl nalezen aktivní nadřazený finanční úřad.`,
      );
    }

    return {
      pracufo,
      ufo: parentUfo,
    };
  }

  private collectVatFigures(invoices: InvoiceWithItems[]): VatFigures {
    const figures: VatFigures = {
      base21: new Decimal(0),
      vat21: new Decimal(0),
      base12: new Decimal(0),
      vat12: new Decimal(0),
      base0: new Decimal(0),
      vat0: new Decimal(0),
      reverse21: new Decimal(0),
      reverse12: new Decimal(0),
    };

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const base = new Decimal(item.lineTotalWithoutVat.toString());
        const vat = new Decimal(item.lineVatAmount.toString());

        const isReverse = invoice.taxClassification === 'domestic_reverse_charge';
        if (isReverse) {
          if (item.vatRate === 21) {
            figures.reverse21 = figures.reverse21.add(base);
          } else if (item.vatRate === 12) {
            figures.reverse12 = figures.reverse12.add(base);
          }
          continue;
        }

        if (item.vatRate === 21) {
          figures.base21 = figures.base21.add(base);
          figures.vat21 = figures.vat21.add(vat);
        } else if (item.vatRate === 12) {
          figures.base12 = figures.base12.add(base);
          figures.vat12 = figures.vat12.add(vat);
        } else if (item.vatRate === 0) {
          figures.base0 = figures.base0.add(base);
          figures.vat0 = figures.vat0.add(vat);
        }
      }
    }

    return figures;
  }

  private validateXmlContent(xml: string): string {
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      throw new UnprocessableEntityException('Vygenerované XML není validní');
    }
    return xml;
  }

  private buildFuVatReturnXml(
    subject: Subject,
    request: TaxReportRequestDto,
    invoices: InvoiceWithItems[],
  ): string {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const figures = this.collectVatFigures(invoices);
    const vatDue = figures.vat21.add(figures.vat12);

    const xmlPayload = {
      Pisemnost: {
        ...this.toFuAttributes({
          nazevSW: 'TappyFaktur',
          verzeSW: '1.0.0',
        }),
        DPHDP3: {
          ...this.toFuAttributes({ verzePis: '01.02.01' }),
          VetaD: this.buildFuVetaD(request, 'DP3', 'dapdph_forma', {
            typ_platce: 'P',
            trans: 'A',
            c_okec: '',
          }),
          VetaP: this.buildFuVetaP(subject),
          Veta1: this.toFuAttributes({
            dan23: this.formatWhole(figures.vat21),
            dan5: this.formatWhole(figures.vat12),
            dan_pzb23: '0',
            dan_pzb5: '0',
            dan_psl23_e: '0',
            dan_psl5_e: '0',
            dan_dzb23: '0',
            dan_dzb5: '0',
            dan_pdop_nrg: '0',
            dan_rpren23: '0',
            dan_rpren5: '0',
            dan_psl23_z: '0',
            dan_psl5_z: '0',
            obrat23: this.formatWhole(figures.base21),
            obrat5: this.formatWhole(figures.base12),
            p_zb23: this.formatWhole(figures.base0),
            p_zb5: '0',
            p_sl23_e: '0',
            p_sl5_e: '0',
            dov_zb23: '0',
            dov_zb5: '0',
            p_dop_nrg: '0',
            rez_pren23: this.formatWhole(figures.reverse21),
            rez_pren5: this.formatWhole(figures.reverse12),
            p_sl23_z: '0',
            p_sl5_z: '0',
          }),
          Veta2: this.toFuAttributes({
            dod_zb: '0',
            pln_sluzby: '0',
            pln_vyvoz: '0',
            dod_dop_nrg: '0',
            pln_zaslani: '0',
            pln_rez_pren: '0',
            pln_ost: '0',
          }),
          Veta3: this.toFuAttributes({
            tri_pozb: '0',
            tri_dozb: '0',
            dov_osv: '0',
            opr_verit: '0',
            opr_dluz: '0',
          }),
          Veta4: this.toFuAttributes({
            pln23: '0',
            pln5: '0',
            dov_cu: '0',
            nar_zdp23: '0',
            nar_zdp5: '0',
            nar_maj: '0',
            odp_tuz23_nar: '0',
            odp_tuz5_nar: '0',
            odp_cu_nar: '0',
            od_zdp23: '0',
            od_zdp5: '0',
            odp_sum_nar: '0',
            od_maj: '0',
            odp_tuz23: '0',
            odp_tuz5: '0',
            odp_cu: '0',
            odp_sum_kr: '0',
            odkr_maj: '0',
          }),
          Veta5: this.toFuAttributes({
            plnosv_kf: '0',
          }),
          Veta6: this.toFuAttributes({
            dan_zocelk: this.formatWhole(vatDue),
            odp_zocelk: '0',
            dano_da: this.formatWhole(vatDue),
            dano_no: '0',
          }),
        },
      },
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlPayload)}`;
    return this.validateXmlContent(xml);
  }

  private buildFuControlStatementXml(
    subject: Subject,
    request: TaxReportRequestDto,
    invoices: InvoiceWithItems[],
  ): string {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const figures = this.collectVatFigures(invoices);
    const domesticInvoices = invoices.filter(
      (invoice) =>
        invoice.taxClassification === 'domestic_standard' ||
        invoice.taxClassification === 'domestic_reverse_charge',
    );

    const vetaA4 = domesticInvoices.map((invoice) => {
      const customerId = this.normalizeVatId(invoice.customerDic) || this.normalizeVatId(invoice.customerIco);
      if (!customerId) {
        throw new BadRequestException(
          `Faktura ${invoice.invoiceNumber ?? invoice.id} nemá vyplněné DIČ nebo IČO odběratele pro kontrolní hlášení.`,
        );
      }

      return this.toFuAttributes({
        c_evid_dd: invoice.invoiceNumber ?? invoice.id.slice(0, 10),
        dan1: this.formatDecimal(invoice.totalVat.toString()),
        dan2: '0',
        dan3: '0',
        dppd: this.formatDateForFu(invoice.taxableSupplyDate),
        dic_odb: customerId,
        zakl_dane1: this.formatDecimal(invoice.totalWithoutVat.toString()),
        zakl_dane2: '0',
        zakl_dane3: '0',
        kod_rezim_pl: '0',
        zdph_44: 'N',
      });
    });

    const reportNode: Record<string, unknown> = {
      ...this.toFuAttributes({ verzePis: '01.02.01' }),
      VetaD: this.buildFuVetaD(request, 'KH1', 'khdph_forma'),
      VetaP: this.buildFuVetaP(subject),
      VetaC: this.toFuAttributes({
        celk_zd_a2: '0',
        obrat23: this.formatDecimal(figures.base21),
        obrat5: this.formatDecimal(figures.base12),
        pln23: '0',
        pln5: '0',
        pln_rez_pren: this.formatDecimal(figures.reverse21.add(figures.reverse12)),
        rez_pren23: this.formatDecimal(figures.reverse21),
        rez_pren5: this.formatDecimal(figures.reverse12),
      }),
    };

    if (vetaA4.length > 0) {
      reportNode.VetaA4 = vetaA4;
    }

    const xmlPayload = {
      Pisemnost: {
        ...this.toFuAttributes({
          nazevSW: 'TappyFaktur',
          verzeSW: '1.0.0',
        }),
        DPHKH1: reportNode,
      },
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlPayload)}`;
    return this.validateXmlContent(xml);
  }

  private buildPreview(
    dto: TaxReportRequestDto,
    invoices: InvoiceWithItems[],
  ): TaxPreviewResult {
    const datasetHash = this.computeDatasetHash(invoices);
    const schemaVersion = this.getSchemaVersion(dto.reportType);

    if (dto.reportType === 'vat_return') {
      return {
        reportType: dto.reportType,
        periodType: dto.periodType,
        year: dto.year,
        value: dto.value,
        schemaVersion,
        invoiceCount: invoices.length,
        datasetHash,
        summary: this.buildVatReturnSummary(invoices),
      };
    }

    return {
      reportType: dto.reportType,
      periodType: dto.periodType,
      year: dto.year,
      value: dto.value,
      schemaVersion,
      invoiceCount: invoices.length,
      datasetHash,
      summary: this.buildControlStatementSummary(invoices),
    };
  }

  private getExportFileName(subject: Subject, request: TaxReportRequestDto): string {
    const normalizedIco = subject.ico.replace(/\s+/g, '');
    const reportTypePart = request.reportType === 'vat_return' ? 'DPH' : 'DPHKH';
    const periodValue =
      request.periodType === 'month'
        ? String(request.value).padStart(2, '0')
        : String(request.value);
    const periodPart = `${periodValue}${request.periodType === 'month' ? 'M' : 'Q'}`;
    return `${normalizedIco}_${reportTypePart}_${request.year}${periodPart}.xml`;
  }

  async preview(userId: string, request: TaxReportRequestDto) {
    const subject = await this.getSubjectByUserOrThrow(userId);
    this.assertVatPayer(subject);
    this.ensureSupportedReportType(request.reportType);

    const normalized = this.normalizePeriod(request);
    const range = this.resolvePeriodRange(normalized);
    const invoices = await this.getInvoicesForPeriod(subject.id, range);

    this.ensureClassifications(invoices);
    return this.buildPreview(normalized, invoices);
  }

  async export(userId: string, request: TaxReportRequestDto) {
    const subject = await this.getSubjectByUserOrThrow(userId);
    this.assertVatPayer(subject);
    this.ensureSupportedReportType(request.reportType);

    const normalized = this.normalizePeriod(request);
    const range = this.resolvePeriodRange(normalized);
    const invoices = await this.getInvoicesForPeriod(subject.id, range);

    this.ensureClassifications(invoices);
    const xml =
      normalized.reportType === 'vat_return'
        ? this.buildFuVatReturnXml(subject, normalized, invoices)
        : this.buildFuControlStatementXml(subject, normalized, invoices);

    return {
      fileName: this.getExportFileName(subject, normalized),
      xml,
    };
  }
}
