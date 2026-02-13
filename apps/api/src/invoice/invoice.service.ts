import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  Subject,
  TaxClassification,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { InvoiceItemDto } from './dto/invoice-item.dto';
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto';

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalWithoutVat: string;
  totalWithVat: string;
  paidAt: string | null;
  description: string;
};

export type InvoiceDetailItem = {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
  lineTotalWithoutVat: string;
  lineVatAmount: string;
  lineTotalWithVat: string;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';
  variableSymbol: string;
  issueDate: string;
  taxableSupplyDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  taxClassification: TaxClassification | null;
  customerName: string;
  customerIco: string | null;
  customerDic: string | null;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountryCode: string;
  note: string | null;
  totalWithoutVat: string;
  totalVat: string;
  totalWithVat: string;
  paidAt: string | null;
  items: InvoiceDetailItem[];
};

type ComputedItems = {
  items: Array<{
    position: number;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    vatRate: number;
    lineTotalWithoutVat: string;
    lineVatAmount: string;
    lineTotalWithVat: string;
  }>;
  totalWithoutVat: string;
  totalVat: string;
  totalWithVat: string;
};

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private toEffectiveStatus(status: InvoiceStatus, dueDate: Date) {
    const today = this.startOfToday();
    if (status === 'issued' && dueDate < today) {
      return 'overdue' as const;
    }
    return status;
  }

  private normalizePostalCode(postalCode: string): string {
    return postalCode.replace(/\s+/g, '');
  }

  private normalizeOptionalText(value?: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
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
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private resolveDefaultVariableSymbol(subject: Subject): string {
    if (subject.defaultVariableSymbolType === 'ico') {
      return subject.ico;
    }

    if (subject.defaultVariableSymbolValue) {
      return subject.defaultVariableSymbolValue;
    }

    throw new BadRequestException('Subject does not have default variable symbol configured');
  }

  private resolveVariableSymbol(subject: Subject, dto: UpsertInvoiceDto): string {
    const explicit = this.normalizeOptionalText(dto.variableSymbol);
    const candidate = explicit ?? this.resolveDefaultVariableSymbol(subject);

    if (!/^\d{1,10}$/.test(candidate)) {
      throw new BadRequestException('Variable symbol must have 1-10 digits');
    }

    return candidate;
  }

  private computeInvoiceTotals(inputItems: InvoiceItemDto[]): ComputedItems {
    if (inputItems.length === 0) {
      throw new BadRequestException('Invoice must contain at least one item');
    }

    const computedItems = inputItems.map((item, index) => {
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);

      if (quantity.lte(0)) {
        throw new BadRequestException('Item quantity must be greater than zero');
      }

      if (unitPrice.lt(0)) {
        throw new BadRequestException('Item unit price cannot be negative');
      }

      const lineTotalWithoutVat = quantity.mul(unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
      const lineVatAmount = lineTotalWithoutVat
        .mul(new Decimal(item.vatRate).div(100))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
      const lineTotalWithVat = lineTotalWithoutVat
        .add(lineVatAmount)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

      return {
        position: index + 1,
        description: item.description.trim(),
        quantity: quantity.toDecimalPlaces(3, Decimal.ROUND_HALF_EVEN).toFixed(3),
        unit: item.unit.trim(),
        unitPrice: unitPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2),
        vatRate: item.vatRate,
        lineTotalWithoutVat: lineTotalWithoutVat.toFixed(2),
        lineVatAmount: lineVatAmount.toFixed(2),
        lineTotalWithVat: lineTotalWithVat.toFixed(2),
      };
    });

    const totalWithoutVat = computedItems
      .reduce((sum, item) => sum.add(item.lineTotalWithoutVat), new Decimal(0))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const totalVat = computedItems
      .reduce((sum, item) => sum.add(item.lineVatAmount), new Decimal(0))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const totalWithVat = totalWithoutVat.add(totalVat).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

    return {
      items: computedItems,
      totalWithoutVat: totalWithoutVat.toFixed(2),
      totalVat: totalVat.toFixed(2),
      totalWithVat: totalWithVat.toFixed(2),
    };
  }

  private buildSupplierSnapshot(subject: Subject) {
    return {
      firstName: subject.firstName,
      lastName: subject.lastName,
      businessName: subject.businessName,
      ico: subject.ico,
      dic: subject.dic,
      street: subject.street,
      city: subject.city,
      postalCode: subject.postalCode,
      countryCode: subject.countryCode,
      bankAccountPrefix: subject.bankAccountPrefix,
      bankAccountNumber: subject.bankAccountNumber,
      bankCode: subject.bankCode,
      isVatPayer: subject.isVatPayer,
    };
  }

  private formatInvoiceNumber(year: number, currentValue: number): string {
    return `${year}${String(currentValue).padStart(4, '0')}`;
  }

  private mapListItem(row: Invoice): InvoiceListItem {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      status: this.toEffectiveStatus(row.status, row.dueDate),
      customerName: row.customerName,
      issueDate: row.issueDate.toISOString(),
      dueDate: row.dueDate.toISOString(),
      totalWithoutVat: row.totalWithoutVat.toString(),
      totalWithVat: row.totalWithVat.toString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      description: row.note?.slice(0, 120) ?? '',
    };
  }

  private mapDetailItem(item: InvoiceItem): InvoiceDetailItem {
    return {
      id: item.id,
      position: item.position,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: item.unitPrice.toString(),
      vatRate: item.vatRate,
      lineTotalWithoutVat: item.lineTotalWithoutVat.toString(),
      lineVatAmount: item.lineVatAmount.toString(),
      lineTotalWithVat: item.lineTotalWithVat.toString(),
    };
  }

  private mapDetail(row: Invoice & { items: InvoiceItem[] }): InvoiceDetail {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      status: this.toEffectiveStatus(row.status, row.dueDate),
      variableSymbol: row.variableSymbol,
      issueDate: row.issueDate.toISOString(),
      taxableSupplyDate: row.taxableSupplyDate.toISOString(),
      dueDate: row.dueDate.toISOString(),
      paymentMethod: row.paymentMethod,
      taxClassification: row.taxClassification,
      customerName: row.customerName,
      customerIco: row.customerIco,
      customerDic: row.customerDic,
      customerStreet: row.customerStreet,
      customerCity: row.customerCity,
      customerPostalCode: row.customerPostalCode,
      customerCountryCode: row.customerCountryCode,
      note: row.note,
      totalWithoutVat: row.totalWithoutVat.toString(),
      totalVat: row.totalVat.toString(),
      totalWithVat: row.totalWithVat.toString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      items: row.items
        .sort((a, b) => a.position - b.position)
        .map((item) => this.mapDetailItem(item)),
    };
  }

  private async getSubjectByUserOrThrow(userId: string): Promise<Subject> {
    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

  private async getInvoiceBySubjectOrThrow(subjectId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        subjectId,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private resolveInvoiceDates(subject: Subject, dto: UpsertInvoiceDto) {
    const issueDate = this.parseDateOnly(dto.issueDate) ?? this.startOfToday();
    const taxableSupplyDate = this.parseDateOnly(dto.taxableSupplyDate) ?? issueDate;
    const dueDate = this.parseDateOnly(dto.dueDate) ?? this.addDays(issueDate, subject.defaultDueDays);

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

    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      return {
        items: [] as InvoiceListItem[],
        total: 0,
        page,
        pageSize,
      };
    }

    const today = this.startOfToday();

    const where: Prisma.InvoiceWhereInput = {
      subjectId: subject.id,
    };

    if (status === 'paid') {
      where.status = 'paid';
    } else if (status === 'unpaid') {
      where.status = 'issued';
    } else if (status === 'overdue') {
      where.status = 'issued';
      where.dueDate = { lt: today };
    }

    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { invoiceNumber: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.mapListItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async getInvoiceDetail(userId: string, invoiceId: string): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const invoice = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);
    return this.mapDetail(invoice);
  }

  async createDraft(userId: string, dto: UpsertInvoiceDto): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const computed = this.computeInvoiceTotals(dto.items);
    const { issueDate, taxableSupplyDate, dueDate } = this.resolveInvoiceDates(subject, dto);
    const variableSymbol = this.resolveVariableSymbol(subject, dto);

    const created = await this.prisma.invoice.create({
      data: {
        subjectId: subject.id,
        status: 'draft',
        invoiceNumber: null,
        variableSymbol,
        issueDate,
        taxableSupplyDate,
        dueDate,
        paymentMethod: dto.paymentMethod ?? 'bank_transfer',
        taxClassification: dto.taxClassification,
        customerName: dto.customerName.trim(),
        customerIco: this.normalizeOptionalText(dto.customerIco),
        customerDic: this.normalizeOptionalText(dto.customerDic),
        customerStreet: dto.customerStreet.trim(),
        customerCity: dto.customerCity.trim(),
        customerPostalCode: this.normalizePostalCode(dto.customerPostalCode),
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
  }

  async updateInvoice(userId: string, invoiceId: string, dto: UpsertInvoiceDto): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);

    if (current.status === 'paid' || current.status === 'cancelled') {
      throw new ConflictException('Paid or cancelled invoice cannot be edited');
    }

    const computed = this.computeInvoiceTotals(dto.items);
    const { issueDate, taxableSupplyDate, dueDate } = this.resolveInvoiceDates(subject, dto);
    const variableSymbol = this.resolveVariableSymbol(subject, dto);

    const updated = await this.prisma.invoice.update({
      where: { id: current.id },
      data: {
        variableSymbol,
        issueDate,
        taxableSupplyDate,
        dueDate,
        paymentMethod: dto.paymentMethod ?? 'bank_transfer',
        taxClassification: dto.taxClassification,
        customerName: dto.customerName.trim(),
        customerIco: this.normalizeOptionalText(dto.customerIco),
        customerDic: this.normalizeOptionalText(dto.customerDic),
        customerStreet: dto.customerStreet.trim(),
        customerCity: dto.customerCity.trim(),
        customerPostalCode: this.normalizePostalCode(dto.customerPostalCode),
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
  }

  async copyInvoice(userId: string, sourceInvoiceId: string): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const source = await this.getInvoiceBySubjectOrThrow(subject.id, sourceInvoiceId);

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

    const computed = this.computeInvoiceTotals(copiedItems);

    const copied = await this.prisma.invoice.create({
      data: {
        subjectId: subject.id,
        status: 'draft',
        invoiceNumber: null,
        variableSymbol: this.resolveDefaultVariableSymbol(subject),
        issueDate,
        taxableSupplyDate: issueDate,
        dueDate,
        paymentMethod: source.paymentMethod,
        taxClassification: source.taxClassification,
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
  }

  private validateReadyToIssue(invoice: Invoice & { items: InvoiceItem[] }): void {
    if (invoice.items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item before issue');
    }

    if (!invoice.taxClassification) {
      throw new BadRequestException('Tax classification is required before issue');
    }

    if (
      (invoice.taxClassification === 'eu_service' || invoice.taxClassification === 'eu_goods') &&
      !invoice.customerDic
    ) {
      throw new BadRequestException('Customer DIC is required for EU tax classification');
    }
  }

  async issueInvoice(userId: string, invoiceId: string): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);

    if (current.status === 'paid' || current.status === 'cancelled') {
      throw new ConflictException('Invoice cannot be issued in current status');
    }

    this.validateReadyToIssue(current);

    await this.prisma.$transaction(async (tx) => {
      const issueYear = current.issueDate.getUTCFullYear();
      let invoiceNumber = current.invoiceNumber;

      if (!invoiceNumber) {
        const sequenceWhere = {
          subjectId_periodYear: {
            subjectId: subject.id,
            periodYear: issueYear,
          },
        };

        await tx.invoiceNumberSequence.upsert({
          where: sequenceWhere,
          create: {
            subjectId: subject.id,
            periodYear: issueYear,
            currentValue: 0,
          },
          update: {},
        });

        const sequence = await tx.invoiceNumberSequence.update({
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

        invoiceNumber = this.formatInvoiceNumber(issueYear, sequence.currentValue);
      }

      await tx.invoice.update({
        where: {
          id: current.id,
        },
        data: {
          status: 'issued',
          invoiceNumber,
          supplierSnapshot: this.buildSupplierSnapshot(subject),
        },
      });
    });

    return this.getInvoiceDetail(userId, invoiceId);
  }

  async markInvoicePaid(userId: string, invoiceId: string, paidAt?: string): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);

    if (current.status === 'draft' || current.status === 'cancelled') {
      throw new ConflictException('Only issued invoice can be marked as paid');
    }

    if (current.status !== 'paid') {
      const paidAtDate = this.parseDateOnly(paidAt) ?? new Date();

      await this.prisma.invoice.update({
        where: { id: current.id },
        data: {
          status: 'paid',
          paidAt: paidAtDate,
        },
      });
    }

    return this.getInvoiceDetail(userId, invoiceId);
  }

  async deleteInvoice(userId: string, invoiceId: string): Promise<void> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);

    if (current.status !== 'draft') {
      throw new ConflictException('Only draft invoice can be deleted');
    }

    await this.prisma.invoice.delete({
      where: {
        id: current.id,
      },
    });
  }
}
