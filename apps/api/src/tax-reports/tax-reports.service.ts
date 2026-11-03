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
import { formatDateOnlyCz, todayDateOnly } from '../utils/date-only';
import { czVatIdNumber, isCzVatId } from '../tax/vat-regime';
import { validateFuXml } from './fu-xsd-validator';
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

/** Hodnoty pro řádky přiznání DPH (DP3) agregované podle daňového režimu. */
type VatFigures = {
  /** ř. 1 – tuzemské zdanitelné plnění, základní sazba */
  base21: Decimal;
  vat21: Decimal;
  /** ř. 2 – tuzemské zdanitelné plnění, snížená sazba */
  base12: Decimal;
  vat12: Decimal;
  /** ř. 20 – dodání zboží do jiného členského státu (§ 64) */
  euGoods: Decimal;
  /** ř. 21 – poskytnutí služeb s místem plnění v jiném členském státě (§ 9 odst. 1) */
  euServices: Decimal;
  /** ř. 22 – vývoz zboží (§ 66) */
  exportGoods: Decimal;
  /** ř. 25 – plnění v režimu přenesení daňové povinnosti (dodavatel, § 92a) */
  reverseCharge: Decimal;
  /** ř. 50 – plnění osvobozená od daně bez nároku na odpočet (§ 51) */
  exemptWithoutCredit: Decimal;
};

/** Limit pro uvádění dokladu v oddílu A.4 kontrolního hlášení (vč. DPH). */
const KH_A4_THRESHOLD = new Decimal(10_000);

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
    const figures = this.collectVatFigures(invoices);
    const rows = this.vatReturnRows(figures);
    return {
      rows: {
        r1_base: rows.base21,
        r1_vat: rows.vat21,
        r2_base: rows.base12,
        r2_vat: rows.vat12,
        r20_euGoods: rows.euGoods,
        r21_euServices: rows.euServices,
        r22_export: rows.exportGoods,
        r25_reverseCharge: rows.reverseCharge,
        r50_exempt: rows.exemptWithoutCredit,
        r62_outputVat: rows.outputVat,
      },
    };
  }

  private buildControlStatementSummary(invoices: InvoiceWithItems[]) {
    const sections = this.splitControlStatement(invoices);
    return {
      a1: sections.a1.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerDic: invoice.customerDic,
        reverseChargeCode: invoice.reverseChargeCode,
        totalWithoutVat: invoice.totalWithoutVat.toString(),
      })),
      a4: sections.a4.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerDic: invoice.customerDic,
        totalWithVat: invoice.totalWithVat.toString(),
      })),
      a5: {
        invoiceCount: sections.a5.length,
        ...this.sumByRate(sections.a5),
      },
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
    return formatDateOnlyCz(value);
  }

  private formatDecimal(value: Decimal.Value): string {
    return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  }

  private formatWhole(value: Decimal.Value): string {
    return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0);
  }

  private normalizeVatId(value?: string | null): string {
    return czVatIdNumber(value);
  }

  private toFuAttributes(values: Record<string, string>): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      // Prázdné hodnoty se vynechávají – XSD je u typovaných atributů (např. c_okec, c_pop) odmítá.
      if (value === '') {
        continue;
      }
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
      d_poddp: this.formatDateForFu(todayDateOnly()),
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
      sest_telef: this.normalizePhoneForFu(subject.contactPhone),
      typ_ds: 'F',
      c_telef: this.normalizePhoneForFu(subject.contactPhone),
      email: subject.contactEmail ?? '',
    });
  }

  /** XSD povoluje max. 14 znaků – odstraníme mezery a oddělovače. */
  private normalizePhoneForFu(phone?: string | null): string {
    return (phone ?? '').replace(/[\s\-()/.]/g, '');
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

  /**
   * Faktury vystavené v době, kdy dodavatel nebyl plátcem DPH (snapshot),
   * do podání DPH nepatří.
   */
  private filterVatPayerInvoices(invoices: InvoiceWithItems[]): InvoiceWithItems[] {
    return invoices.filter((invoice) => {
      const snapshot = invoice.supplierSnapshot;
      if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
        return (snapshot as Record<string, unknown>).isVatPayer !== false;
      }
      return true;
    });
  }

  private invoiceLabel(invoice: InvoiceWithItems): string {
    return invoice.invoiceNumber ?? invoice.id;
  }

  private sumByRate(invoices: InvoiceWithItems[]) {
    let base21 = new Decimal(0);
    let vat21 = new Decimal(0);
    let base12 = new Decimal(0);
    let vat12 = new Decimal(0);
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const base = new Decimal(item.lineTotalWithoutVat.toString());
        const vat = new Decimal(item.lineVatAmount.toString());
        if (item.vatRate === 21) {
          base21 = base21.add(base);
          vat21 = vat21.add(vat);
        } else if (item.vatRate === 12) {
          base12 = base12.add(base);
          vat12 = vat12.add(vat);
        } else {
          throw new BadRequestException(
            `Faktura ${this.invoiceLabel(invoice)} má tuzemské zdanitelné plnění se sazbou ${item.vatRate} %. Opravte sazbu (21 % / 12 %) nebo daňový režim faktury.`,
          );
        }
      }
    }
    return { base21, vat21, base12, vat12 };
  }

  private collectVatFigures(invoices: InvoiceWithItems[]): VatFigures {
    const figures: VatFigures = {
      base21: new Decimal(0),
      vat21: new Decimal(0),
      base12: new Decimal(0),
      vat12: new Decimal(0),
      euGoods: new Decimal(0),
      euServices: new Decimal(0),
      exportGoods: new Decimal(0),
      reverseCharge: new Decimal(0),
      exemptWithoutCredit: new Decimal(0),
    };

    for (const invoice of invoices) {
      const base = new Decimal(invoice.totalWithoutVat.toString());
      switch (invoice.taxClassification) {
        case 'domestic_standard': {
          const sums = this.sumByRate([invoice]);
          figures.base21 = figures.base21.add(sums.base21);
          figures.vat21 = figures.vat21.add(sums.vat21);
          figures.base12 = figures.base12.add(sums.base12);
          figures.vat12 = figures.vat12.add(sums.vat12);
          break;
        }
        case 'domestic_reverse_charge':
          figures.reverseCharge = figures.reverseCharge.add(base);
          break;
        case 'eu_goods':
          figures.euGoods = figures.euGoods.add(base);
          break;
        case 'eu_service':
          figures.euServices = figures.euServices.add(base);
          break;
        case 'export_third_country':
          figures.exportGoods = figures.exportGoods.add(base);
          break;
        case 'exempt_without_credit':
          figures.exemptWithoutCredit = figures.exemptWithoutCredit.add(base);
          break;
        default:
          throw new BadRequestException(
            `Faktura ${this.invoiceLabel(invoice)} nemá vyplněný daňový režim.`,
          );
      }
    }

    return figures;
  }

  /** Hodnoty řádků DP3 zaokrouhlené na celé koruny; ř. 62 je součet zaokrouhlených řádků. */
  private vatReturnRows(figures: VatFigures) {
    const vat21 = this.formatWhole(figures.vat21);
    const vat12 = this.formatWhole(figures.vat12);
    return {
      base21: this.formatWhole(figures.base21),
      vat21,
      base12: this.formatWhole(figures.base12),
      vat12,
      euGoods: this.formatWhole(figures.euGoods),
      euServices: this.formatWhole(figures.euServices),
      exportGoods: this.formatWhole(figures.exportGoods),
      reverseCharge: this.formatWhole(figures.reverseCharge),
      exemptWithoutCredit: this.formatWhole(figures.exemptWithoutCredit),
      outputVat: new Decimal(vat21).add(vat12).toFixed(0),
    };
  }

  /**
   * Rozdělení faktur do oddílů kontrolního hlášení:
   * - A.1: plnění v režimu přenesení daňové povinnosti (dodavatel),
   * - A.4: tuzemské plnění plátci (české DIČ) nad 10 000 Kč vč. DPH,
   * - A.5: ostatní tuzemská plnění (do 10 000 Kč, nebo odběratel bez českého DIČ).
   * Plnění do EU, vývoz a osvobozená plnění se v KH neuvádějí.
   */
  private splitControlStatement(invoices: InvoiceWithItems[]) {
    const a1: InvoiceWithItems[] = [];
    const a4: InvoiceWithItems[] = [];
    const a5: InvoiceWithItems[] = [];

    for (const invoice of invoices) {
      if (invoice.taxClassification === 'domestic_reverse_charge') {
        a1.push(invoice);
      } else if (invoice.taxClassification === 'domestic_standard') {
        const totalWithVat = new Decimal(invoice.totalWithVat.toString());
        if (isCzVatId(invoice.customerDic) && totalWithVat.gt(KH_A4_THRESHOLD)) {
          a4.push(invoice);
        } else {
          a5.push(invoice);
        }
      }
    }

    return { a1, a4, a5 };
  }

  private async validateXmlContent(
    xml: string,
    document: 'DP3' | 'KH1',
  ): Promise<string> {
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      throw new UnprocessableEntityException('Vygenerované XML není validní');
    }

    const errors = await validateFuXml(xml, document);
    if (errors.length > 0) {
      throw new UnprocessableEntityException(
        `Vygenerované XML neodpovídá XSD schématu finanční správy: ${errors
          .slice(0, 5)
          .join('; ')}`,
      );
    }

    return xml;
  }

  private buildFuVatReturnXml(
    subject: Subject,
    request: TaxReportRequestDto,
    invoices: InvoiceWithItems[],
  ): Promise<string> {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const rows = this.vatReturnRows(this.collectVatFigures(invoices));

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
            dan23: rows.vat21,
            dan5: rows.vat12,
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
            obrat23: rows.base21,
            obrat5: rows.base12,
            p_zb23: '0',
            p_zb5: '0',
            p_sl23_e: '0',
            p_sl5_e: '0',
            dov_zb23: '0',
            dov_zb5: '0',
            p_dop_nrg: '0',
            rez_pren23: '0',
            rez_pren5: '0',
            p_sl23_z: '0',
            p_sl5_z: '0',
          }),
          Veta2: this.toFuAttributes({
            dod_zb: rows.euGoods,
            pln_sluzby: rows.euServices,
            pln_vyvoz: rows.exportGoods,
            dod_dop_nrg: '0',
            pln_zaslani: '0',
            pln_rez_pren: rows.reverseCharge,
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
            plnosv_kf: rows.exemptWithoutCredit,
          }),
          Veta6: this.toFuAttributes({
            dan_zocelk: rows.outputVat,
            odp_zocelk: '0',
            dano_da: rows.outputVat,
            dano_no: '0',
          }),
        },
      },
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlPayload)}`;
    return this.validateXmlContent(xml, 'DP3');
  }

  private buildFuControlStatementXml(
    subject: Subject,
    request: TaxReportRequestDto,
    invoices: InvoiceWithItems[],
  ): Promise<string> {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const sections = this.splitControlStatement(invoices);
    const requireCustomerVatId = (invoice: InvoiceWithItems): string => {
      if (!isCzVatId(invoice.customerDic)) {
        throw new BadRequestException(
          `Faktura ${this.invoiceLabel(invoice)} nemá české DIČ odběratele pro kontrolní hlášení.`,
        );
      }
      return this.normalizeVatId(invoice.customerDic);
    };

    const vetaA1 = sections.a1.map((invoice) => {
      if (!invoice.reverseChargeCode) {
        throw new BadRequestException(
          `Faktura ${this.invoiceLabel(invoice)} v režimu přenesení daňové povinnosti nemá kód předmětu plnění.`,
        );
      }
      return this.toFuAttributes({
        dic_odb: requireCustomerVatId(invoice),
        c_evid_dd: this.invoiceLabel(invoice),
        duzp: this.formatDateForFu(invoice.taxableSupplyDate),
        zakl_dane1: this.formatDecimal(invoice.totalWithoutVat.toString()),
        kod_pred_pl: invoice.reverseChargeCode,
      });
    });

    const vetaA4 = sections.a4.map((invoice) => {
      const sums = this.sumByRate([invoice]);
      return this.toFuAttributes({
        dic_odb: requireCustomerVatId(invoice),
        c_evid_dd: this.invoiceLabel(invoice),
        dppd: this.formatDateForFu(invoice.taxableSupplyDate),
        zakl_dane1: this.formatDecimal(sums.base21),
        dan1: this.formatDecimal(sums.vat21),
        zakl_dane2: this.formatDecimal(sums.base12),
        dan2: this.formatDecimal(sums.vat12),
        zakl_dane3: '0',
        dan3: '0',
        kod_rezim_pl: '0',
        zdph_44: 'N',
      });
    });

    const a5Sums = this.sumByRate(sections.a5);
    const a4Sums = this.sumByRate(sections.a4);
    const reverseChargeBase = sections.a1.reduce(
      (sum, invoice) => sum.add(invoice.totalWithoutVat.toString()),
      new Decimal(0),
    );

    // Pořadí vět podle XSD: D, P, A1, A2, A3, A4, A5, B1, B2, B3, C.
    const reportNode: Record<string, unknown> = {
      ...this.toFuAttributes({ verzePis: '01.02.01' }),
      VetaD: this.buildFuVetaD(request, 'KH1', 'khdph_forma'),
      VetaP: this.buildFuVetaP(subject),
    };

    if (vetaA1.length > 0) {
      reportNode.VetaA1 = vetaA1;
    }
    if (vetaA4.length > 0) {
      reportNode.VetaA4 = vetaA4;
    }
    if (sections.a5.length > 0) {
      reportNode.VetaA5 = this.toFuAttributes({
        zakl_dane1: this.formatDecimal(a5Sums.base21),
        dan1: this.formatDecimal(a5Sums.vat21),
        zakl_dane2: this.formatDecimal(a5Sums.base12),
        dan2: this.formatDecimal(a5Sums.vat12),
        zakl_dane3: '0',
        dan3: '0',
      });
    }

    reportNode.VetaC = this.toFuAttributes({
      celk_zd_a2: '0',
      obrat23: this.formatDecimal(a4Sums.base21.add(a5Sums.base21)),
      obrat5: this.formatDecimal(a4Sums.base12.add(a5Sums.base12)),
      pln23: '0',
      pln5: '0',
      pln_rez_pren: this.formatDecimal(reverseChargeBase),
      rez_pren23: '0',
      rez_pren5: '0',
    });

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
    return this.validateXmlContent(xml, 'KH1');
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
    const invoices = this.filterVatPayerInvoices(
      await this.getInvoicesForPeriod(subject.id, range),
    );

    this.ensureClassifications(invoices);
    return this.buildPreview(normalized, invoices);
  }

  async export(userId: string, request: TaxReportRequestDto) {
    const subject = await this.getSubjectByUserOrThrow(userId);
    this.assertVatPayer(subject);
    this.ensureSupportedReportType(request.reportType);

    const normalized = this.normalizePeriod(request);
    const range = this.resolvePeriodRange(normalized);
    const invoices = this.filterVatPayerInvoices(
      await this.getInvoicesForPeriod(subject.id, range),
    );

    this.ensureClassifications(invoices);
    const xml =
      normalized.reportType === 'vat_return'
        ? await this.buildFuVatReturnXml(subject, normalized, invoices)
        : await this.buildFuControlStatementXml(subject, normalized, invoices);

    return {
      fileName: this.getExportFileName(subject, normalized),
      xml,
    };
  }
}
