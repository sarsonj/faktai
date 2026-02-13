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
  TaxClassification,
  TaxPeriodType,
  TaxReportType,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
import { XMLBuilder, XMLValidator } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import { ListTaxRunsQueryDto } from './dto/list-tax-runs.query.dto';
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

@Injectable()
export class TaxReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private normalizePeriod(dto: TaxReportRequestDto): TaxReportRequestDto {
    if (dto.periodType === 'month' && (dto.value < 1 || dto.value > 12)) {
      throw new BadRequestException('For monthly period, value must be 1-12');
    }

    if (dto.periodType === 'quarter' && (dto.value < 1 || dto.value > 4)) {
      throw new BadRequestException('For quarterly period, value must be 1-4');
    }

    return dto;
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
      throw new NotFoundException('Subject not found');
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

  private buildSummaryStatementSummary(invoices: InvoiceWithItems[]) {
    const euInvoices = invoices.filter(
      (invoice) =>
        invoice.taxClassification === 'eu_service' ||
        invoice.taxClassification === 'eu_goods',
    );

    const buckets = new Map<string, Decimal>();
    for (const invoice of euInvoices) {
      const customerDic = invoice.customerDic ?? 'UNKNOWN';
      const key = `${customerDic}|${invoice.taxClassification}`;
      const existing = buckets.get(key) ?? new Decimal(0);
      buckets.set(key, existing.add(invoice.totalWithoutVat.toString()));
    }

    return {
      entries: Array.from(buckets.entries()).map(([key, amount]) => {
        const [customerDic, classification] = key.split('|');
        return {
          customerDic,
          classification,
          amount: amount.toFixed(2),
        };
      }),
      invoiceCount: euInvoices.length,
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
    const byType: Record<TaxReportType, string> = {
      vat_return: this.config.get<string>('XML_SCHEMA_DPH_VERSION') ?? 'current',
      summary_statement:
        this.config.get<string>('XML_SCHEMA_SH_VERSION') ?? 'current',
      control_statement:
        this.config.get<string>('XML_SCHEMA_KH_VERSION') ?? 'current',
    };

    const whitelist = new Set(['current', 'v1']);
    const selectedVersion = byType[reportType];

    if (!whitelist.has(selectedVersion)) {
      throw new BadRequestException(`Unsupported XML schema version: ${selectedVersion}`);
    }

    return selectedVersion;
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

    if (dto.reportType === 'summary_statement') {
      return {
        reportType: dto.reportType,
        periodType: dto.periodType,
        year: dto.year,
        value: dto.value,
        schemaVersion,
        invoiceCount: invoices.length,
        datasetHash,
        summary: this.buildSummaryStatementSummary(invoices),
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

  private buildXml(subject: Subject, preview: TaxPreviewResult): string {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });

    const xmlPayload = {
      TaxReport: {
        Metadata: {
          ReportType: preview.reportType,
          SchemaVersion: preview.schemaVersion,
          PeriodType: preview.periodType,
          Year: preview.year,
          Value: preview.value,
          Currency: 'CZK',
          Subject: {
            ICO: subject.ico,
            DIC: subject.dic,
          },
        },
        Summary: preview.summary,
      },
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlPayload)}`;
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      throw new UnprocessableEntityException('Vygenerované XML není validní');
    }

    return xml;
  }

  private getExportFileName(
    request: TaxReportRequestDto,
    runVersion: number,
  ): string {
    const prefixByType: Record<TaxReportType, string> = {
      vat_return: 'dph-priznani',
      summary_statement: 'souhrnne-hlaseni',
      control_statement: 'kontrolni-hlaseni',
    };

    const suffix =
      request.periodType === 'month'
        ? `${request.year}-${String(request.value).padStart(2, '0')}`
        : `${request.year}-Q${request.value}`;

    return `${prefixByType[request.reportType]}-${suffix}-v${runVersion}.xml`;
  }

  async preview(userId: string, request: TaxReportRequestDto) {
    const subject = await this.getSubjectByUserOrThrow(userId);
    this.assertVatPayer(subject);

    const normalized = this.normalizePeriod(request);
    const range = this.resolvePeriodRange(normalized);
    const invoices = await this.getInvoicesForPeriod(subject.id, range);

    this.ensureClassifications(invoices);
    return this.buildPreview(normalized, invoices);
  }

  async export(userId: string, request: TaxReportRequestDto) {
    const subject = await this.getSubjectByUserOrThrow(userId);
    this.assertVatPayer(subject);

    const normalized = this.normalizePeriod(request);
    const range = this.resolvePeriodRange(normalized);
    const invoices = await this.getInvoicesForPeriod(subject.id, range);

    this.ensureClassifications(invoices);
    const preview = this.buildPreview(normalized, invoices);
    const xml = this.buildXml(subject, preview);

    const latestRun = await this.prisma.taxReportRun.findFirst({
      where: {
        subjectId: subject.id,
        reportType: normalized.reportType,
        periodType: normalized.periodType,
        periodYear: normalized.year,
        periodValue: normalized.value,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    let runVersion = 1;
    if (latestRun) {
      runVersion =
        latestRun.datasetHash === preview.datasetHash
          ? latestRun.runVersion
          : latestRun.runVersion + 1;
    }

    await this.prisma.taxReportRun.create({
      data: {
        subjectId: subject.id,
        reportType: normalized.reportType,
        periodType: normalized.periodType,
        periodYear: normalized.year,
        periodValue: normalized.value,
        runVersion,
        datasetHash: preview.datasetHash,
        generatedByUserId: userId,
        entries: {
          create: invoices.map((invoice) => ({
            invoiceId: invoice.id,
            invoiceUpdatedAtSnapshot: invoice.updatedAt,
          })),
        },
      },
    });

    return {
      fileName: this.getExportFileName(normalized, runVersion),
      xml,
      runVersion,
      datasetHash: preview.datasetHash,
    };
  }

  async listRuns(userId: string, query: ListTaxRunsQueryDto) {
    const subject = await this.getSubjectByUserOrThrow(userId);

    const where: Prisma.TaxReportRunWhereInput = {
      subjectId: subject.id,
      reportType: query.reportType,
      periodType: query.periodType,
      periodYear: query.year,
      periodValue: query.value,
    };

    const runs = await this.prisma.taxReportRun.findMany({
      where,
      orderBy: {
        generatedAt: 'desc',
      },
      take: 50,
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    return runs.map((run) => ({
      id: run.id,
      reportType: run.reportType,
      periodType: run.periodType,
      periodYear: run.periodYear,
      periodValue: run.periodValue,
      runVersion: run.runVersion,
      datasetHash: run.datasetHash,
      generatedAt: run.generatedAt.toISOString(),
      invoiceCount: run._count.entries,
    }));
  }
}
