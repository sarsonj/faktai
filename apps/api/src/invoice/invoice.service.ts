import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Subject, TaxClassification } from '@prisma/client';
import QRCode, { toString as renderQrCode } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { addDaysDateOnly, todayDateOnly } from '../utils/date-only';
import { ChangeInvoiceNumberDto } from './dto/change-invoice-number.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { InvoiceItemDto } from './dto/invoice-item.dto';
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto';
import {
  InvoiceDetail,
  InvoiceListItem,
  mapDetail,
  mapListItem,
} from './invoice.mapper';
import { computeInvoiceTotals } from './domain/invoice-calculation';
import { validateReadyToIssue } from './domain/invoice-issue-validation';
import {
  formatInvoiceNumber,
  parseInvoiceSequenceForYear,
} from './domain/invoice-numbering';
import {
  buildSupplierSnapshot,
  resolveSupplierSnapshot,
} from './domain/supplier-snapshot';
import { invoicePayment, type InvoicePayment } from './payment/payment-qr';
import {
  InvoicePdfRenderer,
  createInvoicePdfHash,
  sanitizeFileToken,
} from './pdf/invoice-pdf.renderer';
import { sqliteYearOf } from '../prisma/sqlite-sql';
import { matchesSearch } from '../utils/search';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfRenderer: InvoicePdfRenderer,
  ) {}

  private startOfToday(): Date {
    return todayDateOnly();
  }

  private normalizePostalCode(postalCode: string): string {
    return postalCode.replace(/\s+/g, '');
  }

  private normalizeIco(value?: string): string | null {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }
    return normalized.replace(/\s+/g, '');
  }

  private normalizeOptionalText(value?: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeInvoiceNumber(value?: string): string | null {
    if (!value) {
      return null;
    }
    return value.replace(/\s+/g, '');
  }

  private parseDateOnly(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date value: ${value}`);
    }

    return date;
  }

  private addDays(date: Date, days: number): Date {
    return addDaysDateOnly(date, days);
  }

  private async getMaxAutoInvoiceSequenceForYear(
    db: DbClient,
    subjectId: string,
    year: number,
  ): Promise<number> {
    const yearPrefix = String(year);
    const numbers = await db.invoice.findMany({
      where: {
        subjectId,
        invoiceNumber: {
          startsWith: yearPrefix,
        },
      },
      select: {
        invoiceNumber: true,
      },
    });

    let maxSequence = 0;
    for (const item of numbers) {
      const sequence = parseInvoiceSequenceForYear(item.invoiceNumber, year);
      if (sequence && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    return maxSequence;
  }

  private async reserveNextInvoiceNumber(
    db: DbClient,
    subjectId: string,
    year: number,
  ): Promise<string> {
    const sequenceWhere = {
      subjectId_periodYear: {
        subjectId,
        periodYear: year,
      },
    };
    const maxSequence = await this.getMaxAutoInvoiceSequenceForYear(
      db,
      subjectId,
      year,
    );

    await db.invoiceNumberSequence.upsert({
      where: sequenceWhere,
      create: {
        subjectId,
        periodYear: year,
        currentValue: maxSequence,
      },
      update: {},
    });

    await db.invoiceNumberSequence.updateMany({
      where: {
        subjectId,
        periodYear: year,
        currentValue: {
          lt: maxSequence,
        },
      },
      data: {
        currentValue: maxSequence,
      },
    });

    const next = await db.invoiceNumberSequence.update({
      where: sequenceWhere,
      data: {
        currentValue: {
          increment: 1,
        },
      },
      select: {
        currentValue: true,
      },
    });

    return formatInvoiceNumber(year, next.currentValue);
  }

  private resolveVariableSymbol(
    dto: UpsertInvoiceDto,
    invoiceNumber: string,
  ): string {
    const explicit = this.normalizeOptionalText(dto.variableSymbol);
    const candidate = explicit ?? invoiceNumber;

    if (!/^\d{1,10}$/.test(candidate)) {
      throw new BadRequestException('Variable symbol must have 1-10 digits');
    }

    return candidate;
  }

  private resolveReverseChargeCode(
    classification: TaxClassification | null | undefined,
    code: string | null | undefined,
  ): string | null {
    if (classification !== 'domestic_reverse_charge') {
      return null;
    }
    return this.normalizeOptionalText(code ?? undefined);
  }

  private isInvoiceNumberUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }
    if (error.code !== 'P2002') {
      return false;
    }

    const target = JSON.stringify(error.meta?.target ?? '');
    return target.includes('subjectId') && target.includes('invoiceNumber');
  }

  async reserveInvoiceNumber(userId: string, issueDate?: string) {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const targetDate = this.parseDateOnly(issueDate) ?? this.startOfToday();
    const year = targetDate.getUTCFullYear();
    const maxSequence = await this.getMaxAutoInvoiceSequenceForYear(
      this.prisma,
      subject.id,
      year,
    );
    const invoiceNumber = formatInvoiceNumber(year, maxSequence + 1);

    return { invoiceNumber };
  }

  private async getSubjectByUserOrThrow(userId: string): Promise<Subject> {
    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

  private async getInvoiceBySubjectOrThrow(
    subjectId: string,
    invoiceId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        subjectId,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
        subject: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private resolveInvoiceDates(subject: Subject, dto: UpsertInvoiceDto) {
    const issueDate = this.parseDateOnly(dto.issueDate) ?? this.startOfToday();
    const taxableSupplyDate =
      this.parseDateOnly(dto.taxableSupplyDate) ?? issueDate;
    const dueDate =
      this.parseDateOnly(dto.dueDate) ??
      this.addDays(issueDate, subject.defaultDueDays);

    if (dueDate < issueDate) {
      throw new BadRequestException('Due date cannot be before issue date');
    }

    return {
      issueDate,
      taxableSupplyDate,
      dueDate,
    };
  }

  async listInvoices(userId: string, query: ListInvoicesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const status = query.status ?? 'all';
    const q = query.q?.trim();
    const currentYear = this.startOfToday().getUTCFullYear();
    const year = query.year ?? currentYear;

    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      return {
        items: [] as InvoiceListItem[],
        total: 0,
        page,
        pageSize,
        year,
        availableYears: [] as number[],
        statusCounts: { all: 0, draft: 0, unpaid: 0, overdue: 0, paid: 0 },
      };
    }

    const today = this.startOfToday();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    // Rok + hledání, bez filtru stavu – základ pro počty v záložkách.
    const baseWhere: Prisma.InvoiceWhereInput = {
      subjectId: subject.id,
      issueDate: {
        gte: yearStart,
        lt: yearEnd,
      },
    };
    if (q) {
      // Hledání bez ohledu na velikost písmen a diakritiku řešíme v aplikaci (CR-0061).
      const candidates = await this.prisma.invoice.findMany({
        where: { ...baseWhere },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          note: true,
        },
      });
      baseWhere.id = {
        in: candidates
          .filter((row) =>
            matchesSearch([row.invoiceNumber, row.customerName, row.note], q),
          )
          .map((row) => row.id),
      };
    }
    const where: Prisma.InvoiceWhereInput = { ...baseWhere };

    if (status === 'draft') {
      where.status = 'draft';
    } else if (status === 'paid') {
      where.status = 'paid';
    } else if (status === 'unpaid') {
      where.status = 'issued';
    } else if (status === 'overdue') {
      where.status = 'issued';
      where.dueDate = { lt: today };
    }

    const availableYearsRaw = await this.prisma.$queryRaw<
      Array<{ year: number }>
    >`
      SELECT DISTINCT ${sqliteYearOf('issueDate')} AS year
      FROM "Invoice"
      WHERE "subjectId" = ${subject.id}
      ORDER BY year DESC
    `;
    const availableYears = availableYearsRaw
      .map((row) => Number(row.year))
      .filter((candidate) => Number.isInteger(candidate));

    const [grouped, overdueCount] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.invoice.count({
        where: { ...baseWhere, status: 'issued', dueDate: { lt: today } },
      }),
    ]);
    const countOf = (value: string) =>
      grouped.find((row) => row.status === value)?._count._all ?? 0;
    const statusCounts = {
      all: grouped.reduce((sum, row) => sum + row._count._all, 0),
      draft: countOf('draft'),
      // „Neuhrazené“ = vystavené včetně těch po splatnosti (stejně jako filtr).
      unpaid: countOf('issued'),
      overdue: overdueCount,
      paid: countOf('paid'),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: {
          items: {
            select: { description: true },
            orderBy: { position: 'asc' },
            take: 1,
          },
        },
        orderBy: [{ issueDate: 'desc' }, { invoiceNumber: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => mapListItem(row)),
      total,
      page,
      pageSize,
      year,
      availableYears,
      statusCounts,
    };
  }

  /**
   * QR platba vystavené faktury pro zobrazení v aplikaci (CR-0062) – stejné
   * údaje jako QR kód v PDF, jen jako SVG.
   */
  async getPaymentQr(
    userId: string,
    invoiceId: string,
  ): Promise<
    InvoicePayment & {
      currency: 'CZK';
      dueDate: string;
      paid: boolean;
      qrSvg: string;
    }
  > {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const invoice = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );
    if (invoice.status === 'draft' || invoice.status === 'cancelled') {
      throw new ConflictException(
        'QR platba je k dispozici jen u vystavené faktury.',
      );
    }
    const payment = invoicePayment(
      resolveSupplierSnapshot(invoice),
      invoice.totalWithVat.toString(),
      invoice.variableSymbol,
    );
    const qrSvg = await renderQrCode(payment.spdPayload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
    });
    return {
      ...payment,
      currency: 'CZK',
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      paid: invoice.status === 'paid',
      qrSvg,
    };
  }

  async getInvoiceDetail(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const invoice = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );
    return mapDetail(invoice);
  }

  async createDraft(
    userId: string,
    dto: UpsertInvoiceDto,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const computed = computeInvoiceTotals(dto.items, {
      isVatPayer: subject.isVatPayer,
      classification: dto.taxClassification,
    });
    const { issueDate, taxableSupplyDate, dueDate } = this.resolveInvoiceDates(
      subject,
      dto,
    );
    const explicitInvoiceNumber = this.normalizeInvoiceNumber(
      dto.invoiceNumber,
    );
    const issueYear = issueDate.getUTCFullYear();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const invoiceNumber =
        explicitInvoiceNumber ??
        (await this.prisma.$transaction((tx) =>
          this.reserveNextInvoiceNumber(tx, subject.id, issueYear),
        ));
      const variableSymbol = this.resolveVariableSymbol(dto, invoiceNumber);

      try {
        const created = await this.prisma.invoice.create({
          data: {
            subjectId: subject.id,
            status: 'draft',
            invoiceNumber,
            variableSymbol,
            issueDate,
            taxableSupplyDate,
            dueDate,
            paymentMethod: dto.paymentMethod ?? 'bank_transfer',
            taxClassification: dto.taxClassification,
            reverseChargeCode: this.resolveReverseChargeCode(
              dto.taxClassification,
              dto.reverseChargeCode,
            ),
            customerName: dto.customerName.trim(),
            customerIco: this.normalizeIco(dto.customerIco),
            customerDic: this.normalizeOptionalText(dto.customerDic),
            customerStreet: dto.customerStreet.trim(),
            customerCity: dto.customerCity.trim(),
            customerPostalCode: this.normalizePostalCode(
              dto.customerPostalCode,
            ),
            customerCountryCode: dto.customerCountryCode,
            note: this.normalizeOptionalText(dto.note),
            supplierSnapshot: Prisma.JsonNull,
            totalWithoutVat: computed.totalWithoutVat,
            totalVat: computed.totalVat,
            totalWithVat: computed.totalWithVat,
            items: {
              create: computed.items,
            },
          },
        });

        return this.getInvoiceDetail(userId, created.id);
      } catch (error) {
        if (!this.isInvoiceNumberUniqueViolation(error)) {
          throw error;
        }
        if (explicitInvoiceNumber) {
          throw new ConflictException('Invoice number already exists.');
        }
      }
    }

    throw new ConflictException('Failed to assign unique invoice number.');
  }

  async updateInvoice(
    userId: string,
    invoiceId: string,
    dto: UpsertInvoiceDto,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    if (current.status === 'cancelled') {
      throw new ConflictException('Cancelled invoice cannot be edited');
    }

    // U vystavené faktury platí plátcovství ze snapshotu dodavatele.
    const isVatPayer =
      current.status === 'draft'
        ? subject.isVatPayer
        : resolveSupplierSnapshot(current).isVatPayer;
    const computed = computeInvoiceTotals(dto.items, {
      isVatPayer,
      classification: dto.taxClassification,
    });
    const { issueDate, taxableSupplyDate, dueDate } = this.resolveInvoiceDates(
      subject,
      dto,
    );
    const issueYear = issueDate.getUTCFullYear();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const invoiceNumber =
        current.invoiceNumber ??
        (await this.prisma.$transaction((tx) =>
          this.reserveNextInvoiceNumber(tx, subject.id, issueYear),
        ));

      const variableSymbol = this.resolveVariableSymbol(dto, invoiceNumber);

      try {
        const updated = await this.prisma.invoice.update({
          where: { id: current.id },
          data: {
            invoiceNumber,
            variableSymbol,
            issueDate,
            taxableSupplyDate,
            dueDate,
            paymentMethod: dto.paymentMethod ?? 'bank_transfer',
            taxClassification: dto.taxClassification,
            reverseChargeCode: this.resolveReverseChargeCode(
              dto.taxClassification,
              dto.reverseChargeCode,
            ),
            customerName: dto.customerName.trim(),
            customerIco: this.normalizeIco(dto.customerIco),
            customerDic: this.normalizeOptionalText(dto.customerDic),
            customerStreet: dto.customerStreet.trim(),
            customerCity: dto.customerCity.trim(),
            customerPostalCode: this.normalizePostalCode(
              dto.customerPostalCode,
            ),
            customerCountryCode: dto.customerCountryCode,
            note: this.normalizeOptionalText(dto.note),
            totalWithoutVat: computed.totalWithoutVat,
            totalVat: computed.totalVat,
            totalWithVat: computed.totalWithVat,
            items: {
              deleteMany: {},
              create: computed.items,
            },
          },
        });

        return this.getInvoiceDetail(userId, updated.id);
      } catch (error) {
        if (!this.isInvoiceNumberUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException('Failed to assign unique invoice number.');
  }

  async copyInvoice(
    userId: string,
    sourceInvoiceId: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const source = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      sourceInvoiceId,
    );

    const issueDate = this.startOfToday();
    const dueDate = this.addDays(issueDate, subject.defaultDueDays);

    const copiedItems: InvoiceItemDto[] = source.items
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: item.unitPrice.toString(),
        vatRate: item.vatRate,
      }));

    const computed = computeInvoiceTotals(copiedItems, {
      isVatPayer: subject.isVatPayer,
      classification: source.taxClassification,
    });
    const issueYear = issueDate.getUTCFullYear();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const invoiceNumber = await this.prisma.$transaction((tx) =>
        this.reserveNextInvoiceNumber(tx, subject.id, issueYear),
      );

      try {
        const copied = await this.prisma.invoice.create({
          data: {
            subjectId: subject.id,
            status: 'draft',
            invoiceNumber,
            variableSymbol: invoiceNumber,
            issueDate,
            taxableSupplyDate: issueDate,
            dueDate,
            paymentMethod: source.paymentMethod,
            taxClassification: source.taxClassification,
            reverseChargeCode: source.reverseChargeCode,
            customerName: source.customerName,
            customerIco: source.customerIco,
            customerDic: source.customerDic,
            customerStreet: source.customerStreet,
            customerCity: source.customerCity,
            customerPostalCode: source.customerPostalCode,
            customerCountryCode: source.customerCountryCode,
            note: source.note,
            supplierSnapshot: Prisma.JsonNull,
            totalWithoutVat: computed.totalWithoutVat,
            totalVat: computed.totalVat,
            totalWithVat: computed.totalWithVat,
            items: {
              create: computed.items,
            },
          },
        });

        return this.getInvoiceDetail(userId, copied.id);
      } catch (error) {
        if (!this.isInvoiceNumberUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException('Failed to assign unique invoice number.');
  }

  /**
   * Vytvoření a okamžité vystavení faktury jedním voláním (API, CR-0058).
   * Připravenost k vystavení se ověří PŘED uložením, aby neplatný požadavek
   * nespotřeboval číslo z řady.
   */
  async createAndIssue(
    userId: string,
    dto: UpsertInvoiceDto,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const computed = computeInvoiceTotals(dto.items, {
      isVatPayer: subject.isVatPayer,
      classification: dto.taxClassification,
    });
    validateReadyToIssue(
      {
        taxClassification: dto.taxClassification ?? null,
        customerDic: this.normalizeOptionalText(dto.customerDic),
        reverseChargeCode:
          dto.taxClassification === 'domestic_reverse_charge'
            ? this.normalizeOptionalText(dto.reverseChargeCode)
            : null,
        items: computed.items,
      },
      subject,
    );

    const draft = await this.createDraft(userId, dto);
    return this.issueInvoice(userId, draft.id);
  }

  /** Detail faktury podle čísla dokladu (pro skripty přes API). */
  async getInvoiceDetailByNumber(
    userId: string,
    invoiceNumber: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        subjectId: subject.id,
        invoiceNumber: this.normalizeInvoiceNumber(invoiceNumber),
      },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.getInvoiceDetail(userId, invoice.id);
  }

  async issueInvoice(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    if (current.status === 'paid' || current.status === 'cancelled') {
      throw new ConflictException('Invoice cannot be issued in current status');
    }

    validateReadyToIssue(current, subject);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const issueYear = current.issueDate.getUTCFullYear();
          const invoiceNumber =
            current.invoiceNumber ??
            (await this.reserveNextInvoiceNumber(tx, subject.id, issueYear));
          const variableSymbol =
            this.normalizeOptionalText(current.variableSymbol) ?? invoiceNumber;

          await tx.invoice.update({
            where: {
              id: current.id,
            },
            data: {
              status: 'issued',
              invoiceNumber,
              variableSymbol,
              supplierSnapshot: buildSupplierSnapshot(subject),
            },
          });
        });
        return this.getInvoiceDetail(userId, invoiceId);
      } catch (error) {
        if (
          this.isInvoiceNumberUniqueViolation(error) &&
          !current.invoiceNumber
        ) {
          continue;
        }
        if (this.isInvoiceNumberUniqueViolation(error)) {
          throw new ConflictException('Invoice number already exists.');
        }
        throw error;
      }
    }

    throw new ConflictException('Failed to assign unique invoice number.');
  }

  async markInvoicePaid(
    userId: string,
    invoiceId: string,
    paidAt?: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    if (current.status === 'draft' || current.status === 'cancelled') {
      throw new ConflictException('Only issued invoice can be marked as paid');
    }

    const explicitPaidAt = this.parseDateOnly(paidAt);

    if (current.status === 'paid' && !explicitPaidAt) {
      return this.getInvoiceDetail(userId, invoiceId);
    }

    const paidAtDate = explicitPaidAt ?? current.paidAt ?? this.startOfToday();

    await this.prisma.invoice.update({
      where: { id: current.id },
      data: {
        status: 'paid',
        paidAt: paidAtDate,
      },
    });

    return this.getInvoiceDetail(userId, invoiceId);
  }

  async markInvoiceUnpaid(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    if (current.status !== 'paid') {
      throw new ConflictException('Only paid invoice can be marked as unpaid');
    }

    await this.prisma.invoice.update({
      where: { id: current.id },
      data: {
        status: 'issued',
        paidAt: null,
      },
    });

    return this.getInvoiceDetail(userId, invoiceId);
  }

  async changeInvoiceNumber(
    userId: string,
    invoiceId: string,
    dto: ChangeInvoiceNumberDto,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    if (current.status === 'cancelled') {
      throw new ConflictException('Cancelled invoice cannot be edited');
    }

    const invoiceNumber = this.normalizeInvoiceNumber(dto.invoiceNumber);
    if (!invoiceNumber) {
      throw new BadRequestException('Invoice number is required');
    }

    const shouldSyncVs = dto.syncVariableSymbol ?? true;

    try {
      await this.prisma.invoice.update({
        where: { id: current.id },
        data: {
          invoiceNumber,
          variableSymbol: shouldSyncVs ? invoiceNumber : current.variableSymbol,
        },
      });
    } catch (error) {
      if (this.isInvoiceNumberUniqueViolation(error)) {
        throw new ConflictException('Invoice number already exists.');
      }
      throw error;
    }

    return this.getInvoiceDetail(userId, invoiceId);
  }

  async refreshSupplierSnapshot(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    if (current.status === 'draft' || current.status === 'cancelled') {
      throw new ConflictException(
        'Dodavatelské údaje lze aktualizovat jen u vystavené nebo uhrazené faktury',
      );
    }

    await this.prisma.invoice.update({
      where: { id: current.id },
      data: {
        supplierSnapshot: buildSupplierSnapshot(subject),
      },
    });

    return this.getInvoiceDetail(userId, invoiceId);
  }

  async exportInvoicePdf(
    userId: string,
    invoiceId: string,
  ): Promise<{ fileName: string; content: Buffer }> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        subjectId: subject.id,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
        subject: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'draft' || invoice.status === 'cancelled') {
      throw new ConflictException(
        'PDF export is allowed only for issued or paid invoices',
      );
    }

    const supplier = resolveSupplierSnapshot(invoice);
    const { iban, spdPayload } = invoicePayment(
      supplier,
      invoice.totalWithVat.toString(),
      invoice.variableSymbol,
    );
    const qrDataUrl = await QRCode.toDataURL(spdPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
    });

    const payloadHash = createInvoicePdfHash({
      invoice,
      supplier,
      spdPayload,
    });

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findUnique({
        where: { id: invoice.id },
        select: {
          pdfVersion: true,
          pdfPayloadHash: true,
        },
      });

      if (!current) {
        throw new NotFoundException('Invoice not found');
      }

      const hasChanged = current.pdfPayloadHash !== payloadHash;
      const nextVersion = hasChanged
        ? current.pdfVersion + 1
        : current.pdfVersion;

      if (hasChanged) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            pdfVersion: nextVersion,
            pdfPayloadHash: payloadHash,
          },
        });
      }

      await tx.pdfExportMetadata.create({
        data: {
          invoiceId: invoice.id,
          exportedByUserId: userId,
          pdfVersion: nextVersion,
          payloadHash,
        },
      });
    });

    const pdfBuffer = await this.pdfRenderer.render({
      invoice,
      supplier,
      qrDataUrl,
      iban,
    });

    const safeIco = sanitizeFileToken(supplier.ico || 'ICO');
    const safeInvoiceNumber = sanitizeFileToken(
      invoice.invoiceNumber ?? invoice.id,
    );
    return {
      fileName: `faktura_${safeIco}_${safeInvoiceNumber}.pdf`,
      content: pdfBuffer,
    };
  }

  async deleteInvoice(userId: string, invoiceId: string): Promise<void> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(
      subject.id,
      invoiceId,
    );

    await this.prisma.invoice.delete({
      where: {
        id: current.id,
      },
    });
  }
}
