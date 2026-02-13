import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
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
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeInvoiceNumberDto } from './dto/change-invoice-number.dto';
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
  pdfVersion: number;
  paidAt: string | null;
  items: InvoiceDetailItem[];
};

type SupplierSnapshot = {
  firstName: string;
  lastName: string;
  businessName: string | null;
  ico: string;
  dic: string | null;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix: string | null;
  bankAccountNumber: string;
  bankCode: string;
  isVatPayer: boolean;
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

type PdfFontNames = {
  regular: string;
  bold: string;
};

type DbClient = PrismaService | Prisma.TransactionClient;

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
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private validateInvoiceNumber(invoiceNumber: string, issueDate: Date): void {
    if (!/^\d{5,10}$/.test(invoiceNumber)) {
      throw new BadRequestException(
        'Invoice number must have format YYYY + sequence (5-10 digits)',
      );
    }

    const issueYear = String(issueDate.getUTCFullYear());
    if (!invoiceNumber.startsWith(issueYear)) {
      throw new BadRequestException(
        'Invoice number must start with invoice issue year',
      );
    }
  }

  private parseInvoiceSequenceForYear(
    invoiceNumber: string | null,
    year: number,
  ): number | null {
    if (!invoiceNumber) {
      return null;
    }

    const match = invoiceNumber.match(new RegExp(`^${year}(\\d+)$`));
    if (!match) {
      return null;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
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
      const sequence = this.parseInvoiceSequenceForYear(item.invoiceNumber, year);
      if (sequence && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

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

    return this.formatInvoiceNumber(year, next.currentValue);
  }

  private resolveVariableSymbol(dto: UpsertInvoiceDto, invoiceNumber: string): string {
    const explicit = this.normalizeOptionalText(dto.variableSymbol);
    const candidate = explicit ?? invoiceNumber;

    if (!/^\d{1,10}$/.test(candidate)) {
      throw new BadRequestException('Variable symbol must have 1-10 digits');
    }

    return candidate;
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
    const invoiceNumber = await this.prisma.$transaction((tx) =>
      this.reserveNextInvoiceNumber(tx, subject.id, year),
    );

    return { invoiceNumber };
  }

  private computeInvoiceTotals(inputItems: InvoiceItemDto[]): ComputedItems {
    if (inputItems.length === 0) {
      throw new BadRequestException('Invoice must contain at least one item');
    }

    const computedItems = inputItems.map((item, index) => {
      const quantity = new Decimal(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);

      if (quantity.lte(0)) {
        throw new BadRequestException(
          'Item quantity must be greater than zero',
        );
      }

      if (unitPrice.lt(0)) {
        throw new BadRequestException('Item unit price cannot be negative');
      }

      const lineTotalWithoutVat = quantity
        .mul(unitPrice)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
      const lineVatAmount = lineTotalWithoutVat
        .mul(new Decimal(item.vatRate).div(100))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
      const lineTotalWithVat = lineTotalWithoutVat
        .add(lineVatAmount)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

      return {
        position: index + 1,
        description: item.description.trim(),
        quantity: quantity
          .toDecimalPlaces(3, Decimal.ROUND_HALF_EVEN)
          .toFixed(3),
        unit: item.unit.trim(),
        unitPrice: unitPrice
          .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
          .toFixed(2),
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
    const totalWithVat = totalWithoutVat
      .add(totalVat)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

    return {
      items: computedItems,
      totalWithoutVat: totalWithoutVat.toFixed(2),
      totalVat: totalVat.toFixed(2),
      totalWithVat: totalWithVat.toFixed(2),
    };
  }

  private buildSupplierSnapshot(subject: Subject): SupplierSnapshot {
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
    return `${year}${String(currentValue).padStart(2, '0')}`;
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
      pdfVersion: row.pdfVersion,
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

  private getSupplierSnapshotForPdf(
    invoice: Invoice & { subject: Subject },
  ): SupplierSnapshot {
    const raw = invoice.supplierSnapshot;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return this.buildSupplierSnapshot(invoice.subject);
    }

    const snapshot = raw as Record<string, unknown>;
    const fallback = this.buildSupplierSnapshot(invoice.subject);

    return {
      firstName:
        typeof snapshot.firstName === 'string'
          ? snapshot.firstName
          : fallback.firstName,
      lastName:
        typeof snapshot.lastName === 'string'
          ? snapshot.lastName
          : fallback.lastName,
      businessName:
        typeof snapshot.businessName === 'string'
          ? snapshot.businessName
          : fallback.businessName,
      ico: typeof snapshot.ico === 'string' ? snapshot.ico : fallback.ico,
      dic: typeof snapshot.dic === 'string' ? snapshot.dic : fallback.dic,
      street:
        typeof snapshot.street === 'string' ? snapshot.street : fallback.street,
      city: typeof snapshot.city === 'string' ? snapshot.city : fallback.city,
      postalCode:
        typeof snapshot.postalCode === 'string'
          ? snapshot.postalCode
          : fallback.postalCode,
      countryCode:
        typeof snapshot.countryCode === 'string'
          ? snapshot.countryCode
          : fallback.countryCode,
      bankAccountPrefix:
        typeof snapshot.bankAccountPrefix === 'string'
          ? snapshot.bankAccountPrefix
          : fallback.bankAccountPrefix,
      bankAccountNumber:
        typeof snapshot.bankAccountNumber === 'string'
          ? snapshot.bankAccountNumber
          : fallback.bankAccountNumber,
      bankCode:
        typeof snapshot.bankCode === 'string'
          ? snapshot.bankCode
          : fallback.bankCode,
      isVatPayer:
        typeof snapshot.isVatPayer === 'boolean'
          ? snapshot.isVatPayer
          : fallback.isVatPayer,
    };
  }

  private toCzIban(
    bankAccountPrefix: string | null,
    bankAccountNumber: string,
    bankCode: string,
  ): string {
    if (!/^\d{2,10}$/.test(bankAccountNumber)) {
      throw new UnprocessableEntityException(
        'Nevalidní číslo účtu pro QR platbu',
      );
    }
    if (bankAccountPrefix && !/^\d{1,6}$/.test(bankAccountPrefix)) {
      throw new UnprocessableEntityException(
        'Nevalidní prefix účtu pro QR platbu',
      );
    }
    if (!/^\d{4}$/.test(bankCode)) {
      throw new UnprocessableEntityException(
        'Nevalidní kód banky pro QR platbu',
      );
    }

    const prefix = (bankAccountPrefix ?? '').padStart(6, '0');
    const number = bankAccountNumber.padStart(10, '0');
    const bban = `${bankCode}${prefix}${number}`;
    const rearranged = `${bban}CZ00`;

    let numeric = '';
    for (const char of rearranged) {
      if (/[A-Z]/.test(char)) {
        numeric += String(char.charCodeAt(0) - 55);
      } else {
        numeric += char;
      }
    }

    let remainder = 0;
    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }

    const checkDigits = String(98 - remainder).padStart(2, '0');
    return `CZ${checkDigits}${bban}`;
  }

  private buildSpdPayload(
    iban: string,
    amount: string,
    variableSymbol: string,
  ): string {
    return `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*X-VS:${variableSymbol}`;
  }

  private createPdfHash(input: {
    invoice: Invoice & { items: InvoiceItem[] };
    supplier: SupplierSnapshot;
    spdPayload: string;
  }): string {
    const payload = {
      id: input.invoice.id,
      invoiceNumber: input.invoice.invoiceNumber,
      variableSymbol: input.invoice.variableSymbol,
      issueDate: input.invoice.issueDate.toISOString(),
      dueDate: input.invoice.dueDate.toISOString(),
      taxableSupplyDate: input.invoice.taxableSupplyDate.toISOString(),
      taxClassification: input.invoice.taxClassification,
      customerName: input.invoice.customerName,
      customerIco: input.invoice.customerIco,
      customerDic: input.invoice.customerDic,
      customerStreet: input.invoice.customerStreet,
      customerCity: input.invoice.customerCity,
      customerPostalCode: input.invoice.customerPostalCode,
      customerCountryCode: input.invoice.customerCountryCode,
      note: input.invoice.note,
      totalWithoutVat: input.invoice.totalWithoutVat.toString(),
      totalVat: input.invoice.totalVat.toString(),
      totalWithVat: input.invoice.totalWithVat.toString(),
      supplier: input.supplier,
      items: input.invoice.items
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          position: item.position,
          description: item.description,
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: item.unitPrice.toString(),
          vatRate: item.vatRate,
          lineTotalWithoutVat: item.lineTotalWithoutVat.toString(),
          lineVatAmount: item.lineVatAmount.toString(),
          lineTotalWithVat: item.lineTotalWithVat.toString(),
        })),
      spdPayload: input.spdPayload,
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private formatMoney(value: string): string {
    const numeric = Number(value);
    return `${numeric.toLocaleString('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Kč`;
  }

  private formatDateCz(value: Date): string {
    return value.toLocaleDateString('cs-CZ');
  }

  private formatSupplierBankAccount(supplier: SupplierSnapshot): string {
    return supplier.bankAccountPrefix
      ? `${supplier.bankAccountPrefix}-${supplier.bankAccountNumber}/${supplier.bankCode}`
      : `${supplier.bankAccountNumber}/${supplier.bankCode}`;
  }

  private buildVatRows(items: InvoiceItem[]) {
    const grouped = new Map<number, { base: Decimal; vat: Decimal; total: Decimal }>();
    for (const item of items) {
      const current = grouped.get(item.vatRate) ?? {
        base: new Decimal(0),
        vat: new Decimal(0),
        total: new Decimal(0),
      };
      current.base = current.base.add(item.lineTotalWithoutVat.toString());
      current.vat = current.vat.add(item.lineVatAmount.toString());
      current.total = current.total.add(item.lineTotalWithVat.toString());
      grouped.set(item.vatRate, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, values]) => ({
        rate,
        base: values.base.toFixed(2),
        vat: values.vat.toFixed(2),
        total: values.total.toFixed(2),
      }));
  }

  private drawPseudoBarcode(doc: PDFKit.PDFDocument, x: number, y: number, width: number, value: string) {
    const bars = value.replace(/\D/g, '');
    if (!bars) {
      return;
    }

    const barWidth = Math.max(1, Math.floor(width / (bars.length * 2)));
    let currentX = x;
    for (let i = 0; i < bars.length; i += 1) {
      const digit = Number(bars[i]);
      const height = 16 + (digit % 4) * 3;
      doc.rect(currentX, y, barWidth, height).fill('#111111');
      currentX += barWidth * 2;
      if (currentX > x + width) {
        break;
      }
    }
  }

  private resolvePdfFontNames(doc: PDFKit.PDFDocument): PdfFontNames {
    const candidates = [
      join(__dirname, '../../assets/fonts'),
      join(process.cwd(), 'assets/fonts'),
      join(process.cwd(), 'apps/api/assets/fonts'),
    ];

    for (const base of candidates) {
      const regular = join(base, 'NotoSans-Regular.ttf');
      const bold = join(base, 'NotoSans-Bold.ttf');
      if (existsSync(regular) && existsSync(bold)) {
        doc.registerFont('TappyFaktur-Regular', regular);
        doc.registerFont('TappyFaktur-Bold', bold);
        return {
          regular: 'TappyFaktur-Regular',
          bold: 'TappyFaktur-Bold',
        };
      }
    }

    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
    };
  }

  private cleanInlineText(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.replace(/\s+/g, ' ').trim();
  }

  private drawSingleLine(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    fontName: string,
    fontSize = 9,
    align: 'left' | 'right' | 'center' | 'justify' = 'left',
    color = '#111111',
  ): void {
    doc
      .font(fontName)
      .fontSize(fontSize)
      .fillColor(color)
      .text(this.cleanInlineText(text), x, y, {
        width,
        align,
        lineBreak: false,
        ellipsis: true,
      });
  }

  private async renderPdf(input: {
    invoice: Invoice & { items: InvoiceItem[] };
    supplier: SupplierSnapshot;
    qrDataUrl: string;
    iban: string;
  }): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
    });

    const chunks: Buffer[] = [];
    const qrImage = Buffer.from(
      input.qrDataUrl.replace(/^data:image\/png;base64,/, ''),
      'base64',
    );

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fonts = this.resolvePdfFontNames(doc);
      const left = doc.page.margins.left;
      const top = doc.page.margins.top;
      const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const right = left + contentWidth;
      const colGap = 20;
      const colWidth = (contentWidth - colGap) / 2;
      const rightColX = left + colWidth + colGap;
      const maxBodyBottom = doc.page.height - doc.page.margins.bottom - 132;

      const supplierName = input.supplier.businessName
        ? input.supplier.businessName
        : `${input.supplier.firstName} ${input.supplier.lastName}`;
      const invoiceNumber = input.invoice.invoiceNumber ?? input.invoice.id.slice(0, 8);

      this.drawSingleLine(doc, 'Dodavatel', left, top, colWidth, fonts.bold, 10);
      this.drawSingleLine(doc, supplierName, left, top + 16, colWidth, fonts.regular);
      this.drawSingleLine(doc, input.supplier.street, left, top + 30, colWidth, fonts.regular);
      this.drawSingleLine(
        doc,
        `${input.supplier.postalCode} ${input.supplier.city}`,
        left,
        top + 44,
        colWidth,
        fonts.regular,
      );
      this.drawSingleLine(
        doc,
        input.supplier.countryCode === 'CZ' ? 'Česká republika' : input.supplier.countryCode,
        left,
        top + 58,
        colWidth,
        fonts.regular,
      );
      this.drawSingleLine(
        doc,
        `IČ: ${input.supplier.ico}${input.supplier.dic ? `    DIČ: ${input.supplier.dic}` : ''}`,
        left,
        top + 74,
        colWidth,
        fonts.regular,
      );

      this.drawSingleLine(doc, 'Faktura - daňový doklad', rightColX, top + 4, colWidth - 104, fonts.bold, 16);
      doc.rect(right - 94, top, 94, 28).fill('#eeeeee');
      this.drawSingleLine(doc, invoiceNumber, right - 90, top + 8, 86, fonts.bold, 12, 'center');
      this.drawPseudoBarcode(doc, right - 90, top + 34, 86, invoiceNumber);

      this.drawSingleLine(doc, 'Odběratel', rightColX, top + 98, colWidth, fonts.bold, 10);
      this.drawSingleLine(doc, input.invoice.customerName, rightColX, top + 114, colWidth, fonts.regular);
      this.drawSingleLine(doc, input.invoice.customerStreet, rightColX, top + 128, colWidth, fonts.regular);
      this.drawSingleLine(
        doc,
        `${input.invoice.customerPostalCode} ${input.invoice.customerCity}`,
        rightColX,
        top + 142,
        colWidth,
        fonts.regular,
      );
      this.drawSingleLine(
        doc,
        input.invoice.customerCountryCode === 'CZ' ? 'Česká republika' : input.invoice.customerCountryCode,
        rightColX,
        top + 156,
        colWidth,
        fonts.regular,
      );
      const customerIdLine = [
        input.invoice.customerIco ? `IČ: ${input.invoice.customerIco}` : '',
        input.invoice.customerDic ? `DIČ: ${input.invoice.customerDic}` : '',
      ]
        .filter(Boolean)
        .join('    ');
      if (customerIdLine) {
        this.drawSingleLine(doc, customerIdLine, rightColX, top + 170, colWidth, fonts.regular);
      }

      let y = top + 204;
      this.drawSingleLine(doc, 'Způsob úhrady:', left, y, 92, fonts.regular, 9);
      this.drawSingleLine(doc, 'Převodem', left + 72, y, 120, fonts.bold, 9);
      y += 16;

      const paymentTableTop = y;
      const paymentTableHeight = 94;
      const col1Width = 220;
      const col2Width = 130;
      const col3Width = contentWidth - col1Width - col2Width;
      doc.rect(left, paymentTableTop, contentWidth, paymentTableHeight).strokeColor('#d4d4d4').stroke();
      doc
        .moveTo(left + col1Width, paymentTableTop)
        .lineTo(left + col1Width, paymentTableTop + paymentTableHeight)
        .stroke();
      doc
        .moveTo(left + col1Width + col2Width, paymentTableTop)
        .lineTo(left + col1Width + col2Width, paymentTableTop + paymentTableHeight)
        .stroke();
      doc
        .moveTo(left, paymentTableTop + 20)
        .lineTo(right, paymentTableTop + 20)
        .stroke();

      this.drawSingleLine(doc, 'Bankovní účet', left + 6, paymentTableTop + 6, col1Width - 12, fonts.bold, 9);
      this.drawSingleLine(doc, 'Symbol', left + col1Width + 6, paymentTableTop + 6, col2Width - 12, fonts.bold, 9);
      this.drawSingleLine(doc, 'Datum', left + col1Width + col2Width + 6, paymentTableTop + 6, col3Width - 12, fonts.bold, 9);

      this.drawSingleLine(
        doc,
        this.formatSupplierBankAccount(input.supplier),
        left + 6,
        paymentTableTop + 28,
        col1Width - 12,
        fonts.regular,
        9,
      );
      this.drawSingleLine(doc, `IBAN: ${input.iban}`, left + 6, paymentTableTop + 42, col1Width - 12, fonts.regular, 9);
      this.drawSingleLine(doc, 'SWIFT: FIOBCZPPXXX', left + 6, paymentTableTop + 56, col1Width - 12, fonts.regular, 9);

      this.drawSingleLine(doc, 'variabilní:', left + col1Width + 6, paymentTableTop + 28, 52, fonts.regular, 9);
      this.drawSingleLine(
        doc,
        input.invoice.variableSymbol,
        left + col1Width + 58,
        paymentTableTop + 28,
        col2Width - 64,
        fonts.bold,
        9,
      );
      this.drawSingleLine(doc, 'konstantní:', left + col1Width + 6, paymentTableTop + 42, 52, fonts.regular, 9);
      this.drawSingleLine(doc, '0308', left + col1Width + 58, paymentTableTop + 42, col2Width - 64, fonts.bold, 9);

      this.drawSingleLine(doc, 'vystavení:', left + col1Width + col2Width + 6, paymentTableTop + 28, 52, fonts.regular, 9);
      this.drawSingleLine(
        doc,
        this.formatDateCz(input.invoice.issueDate),
        left + col1Width + col2Width + 58,
        paymentTableTop + 28,
        col3Width - 64,
        fonts.bold,
        9,
      );
      this.drawSingleLine(doc, 'splatnosti:', left + col1Width + col2Width + 6, paymentTableTop + 42, 52, fonts.regular, 9);
      this.drawSingleLine(
        doc,
        this.formatDateCz(input.invoice.dueDate),
        left + col1Width + col2Width + 58,
        paymentTableTop + 42,
        col3Width - 64,
        fonts.bold,
        9,
      );
      this.drawSingleLine(doc, 'DUZP:', left + col1Width + col2Width + 6, paymentTableTop + 56, 52, fonts.regular, 9);
      this.drawSingleLine(
        doc,
        this.formatDateCz(input.invoice.taxableSupplyDate),
        left + col1Width + col2Width + 58,
        paymentTableTop + 56,
        col3Width - 64,
        fonts.bold,
        9,
      );

      y = paymentTableTop + paymentTableHeight + 14;
      this.drawSingleLine(
        doc,
        `Fakturujeme: ${input.invoice.note ?? input.invoice.items[0]?.description ?? ''}`,
        left,
        y,
        contentWidth,
        fonts.regular,
        9,
        'left',
        '#222222',
      );

      y += 18;
      const itemHeaderHeight = 18;
      const itemRowHeight = 18;
      const cols = [170, 50, 64, 40, 72, 62, 65];
      const itemHeaders = ['Označení dodávky', 'Počet m.j.', 'Cena za m.j.', 'DPH %', 'Bez DPH', 'DPH', 'Celkem'];

      doc.rect(left, y, contentWidth, itemHeaderHeight).fill('#f3f3f3');
      let cx = left + 4;
      for (let i = 0; i < itemHeaders.length; i += 1) {
        this.drawSingleLine(
          doc,
          itemHeaders[i],
          cx,
          y + 6,
          cols[i] - 8,
          fonts.bold,
          8,
          i === 0 ? 'left' : 'right',
        );
        cx += cols[i];
      }
      y += itemHeaderHeight;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#d4d4d4').stroke();

      const sortedItems = [...input.invoice.items].sort((a, b) => a.position - b.position);
      let renderedItems = 0;
      for (const item of sortedItems) {
        if (y + itemRowHeight > maxBodyBottom) {
          break;
        }
        cx = left + 4;
        this.drawSingleLine(doc, item.description, cx, y + 5, cols[0] - 8, fonts.regular, 8.5);
        cx += cols[0];
        this.drawSingleLine(doc, item.quantity.toString(), cx, y + 5, cols[1] - 8, fonts.regular, 8.5, 'right');
        cx += cols[1];
        this.drawSingleLine(doc, item.unitPrice.toString(), cx, y + 5, cols[2] - 8, fonts.regular, 8.5, 'right');
        cx += cols[2];
        this.drawSingleLine(doc, String(item.vatRate), cx, y + 5, cols[3] - 8, fonts.regular, 8.5, 'right');
        cx += cols[3];
        this.drawSingleLine(
          doc,
          this.formatMoney(item.lineTotalWithoutVat.toString()),
          cx,
          y + 5,
          cols[4] - 8,
          fonts.regular,
          8.5,
          'right',
        );
        cx += cols[4];
        this.drawSingleLine(
          doc,
          this.formatMoney(item.lineVatAmount.toString()),
          cx,
          y + 5,
          cols[5] - 8,
          fonts.regular,
          8.5,
          'right',
        );
        cx += cols[5];
        this.drawSingleLine(
          doc,
          this.formatMoney(item.lineTotalWithVat.toString()),
          cx,
          y + 5,
          cols[6] - 8,
          fonts.bold,
          8.5,
          'right',
        );
        y += itemRowHeight;
        doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e5e5').stroke();
        renderedItems += 1;
      }

      if (renderedItems < sortedItems.length && y + itemRowHeight <= maxBodyBottom) {
        this.drawSingleLine(
          doc,
          `... a dalších ${sortedItems.length - renderedItems} položek`,
          left + 6,
          y + 5,
          contentWidth - 12,
          fonts.regular,
          8.5,
        );
        y += itemRowHeight;
        doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e5e5').stroke();
      }

      y += 10;
      doc.image(qrImage, left, y, { width: 95, height: 95 });
      this.drawSingleLine(doc, 'QR Platba+F', left + 2, y + 100, 100, fonts.bold, 10);

      const vatTableX = left + 190;
      const vatTableY = y + 8;
      const vatTableW = contentWidth - 190;
      const vatHeaderH = 16;
      const vatRowH = 16;
      const vatCols = [62, 88, 88, vatTableW - 238];
      doc.rect(vatTableX, vatTableY, vatTableW, vatHeaderH).fill('#f3f3f3');
      let vx = vatTableX + 4;
      for (const [index, heading] of ['Sazba DPH', 'Základ', 'Výše DPH', 'Celkem'].entries()) {
        this.drawSingleLine(
          doc,
          heading,
          vx,
          vatTableY + 5,
          vatCols[index] - 8,
          fonts.bold,
          8,
          index === 0 ? 'left' : 'right',
        );
        vx += vatCols[index];
      }

      const vatRows = this.buildVatRows(sortedItems);
      let vy = vatTableY + vatHeaderH;
      for (const row of vatRows) {
        vx = vatTableX + 4;
        this.drawSingleLine(doc, `${row.rate} %`, vx, vy + 5, vatCols[0] - 8, fonts.regular, 8.5);
        vx += vatCols[0];
        this.drawSingleLine(doc, this.formatMoney(row.base), vx, vy + 5, vatCols[1] - 8, fonts.regular, 8.5, 'right');
        vx += vatCols[1];
        this.drawSingleLine(doc, this.formatMoney(row.vat), vx, vy + 5, vatCols[2] - 8, fonts.regular, 8.5, 'right');
        vx += vatCols[2];
        this.drawSingleLine(doc, this.formatMoney(row.total), vx, vy + 5, vatCols[3] - 8, fonts.bold, 8.5, 'right');
        vy += vatRowH;
        doc.moveTo(vatTableX, vy).lineTo(vatTableX + vatTableW, vy).strokeColor('#e5e5e5').stroke();
      }

      vx = vatTableX + 4;
      this.drawSingleLine(doc, 'CELKEM', vx, vy + 5, vatCols[0] - 8, fonts.bold, 8.5);
      vx += vatCols[0];
      this.drawSingleLine(
        doc,
        this.formatMoney(input.invoice.totalWithoutVat.toString()),
        vx,
        vy + 5,
        vatCols[1] - 8,
        fonts.bold,
        8.5,
        'right',
      );
      vx += vatCols[1];
      this.drawSingleLine(
        doc,
        this.formatMoney(input.invoice.totalVat.toString()),
        vx,
        vy + 5,
        vatCols[2] - 8,
        fonts.bold,
        8.5,
        'right',
      );
      vx += vatCols[2];
      this.drawSingleLine(
        doc,
        this.formatMoney(input.invoice.totalWithVat.toString()),
        vx,
        vy + 5,
        vatCols[3] - 8,
        fonts.bold,
        8.5,
        'right',
      );

      vy += vatRowH + 10;
      this.drawSingleLine(
        doc,
        `Celkem k úhradě: ${this.formatMoney(input.invoice.totalWithVat.toString())}`,
        vatTableX,
        vy,
        vatTableW,
        fonts.bold,
        14,
        'right',
      );

      const noteY = Math.max(vy + 26, y + 120);
      if (input.invoice.note) {
        this.drawSingleLine(
          doc,
          `Poznámka: ${input.invoice.note}`,
          left,
          noteY,
          contentWidth,
          fonts.regular,
          9,
          'left',
          '#333333',
        );
      }

      const footerY = doc.page.height - doc.page.margins.bottom - 16;
      doc.moveTo(left, footerY - 12).lineTo(right, footerY - 12).strokeColor('#d8d8d8').stroke();
      this.drawSingleLine(
        doc,
        `Vytiskl(a): ${input.supplier.firstName} ${input.supplier.lastName}, ${this.formatDateCz(new Date())}`,
        left,
        footerY,
        200,
        fonts.regular,
        7.5,
        'left',
        '#555555',
      );
      this.drawSingleLine(
        doc,
        'Vystaveno v online fakturační službě iDoklad',
        left + 200,
        footerY,
        220,
        fonts.regular,
        7.5,
        'center',
        '#555555',
      );
      this.drawSingleLine(doc, 'Strana 1/1', right - 70, footerY, 70, fonts.regular, 7.5, 'right', '#555555');

      doc.end();
    });
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
      };
    }

    const today = this.startOfToday();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const where: Prisma.InvoiceWhereInput = {
      subjectId: subject.id,
      issueDate: {
        gte: yearStart,
        lt: yearEnd,
      },
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

    const availableYearsRaw = await this.prisma.$queryRaw<Array<{ year: number }>>`
      SELECT DISTINCT EXTRACT(YEAR FROM "issueDate")::int AS year
      FROM "Invoice"
      WHERE "subjectId" = ${subject.id}
      ORDER BY year DESC
    `;
    const availableYears = availableYearsRaw
      .map((row) => Number(row.year))
      .filter((candidate) => Number.isInteger(candidate));

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
      year,
      availableYears,
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
    return this.mapDetail(invoice);
  }

  async createDraft(
    userId: string,
    dto: UpsertInvoiceDto,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const computed = this.computeInvoiceTotals(dto.items);
    const { issueDate, taxableSupplyDate, dueDate } = this.resolveInvoiceDates(
      subject,
      dto,
    );
    const explicitInvoiceNumber = this.normalizeInvoiceNumber(dto.invoiceNumber);
    const issueYear = issueDate.getUTCFullYear();

    if (explicitInvoiceNumber) {
      this.validateInvoiceNumber(explicitInvoiceNumber, issueDate);
    }

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
            customerName: dto.customerName.trim(),
            customerIco: this.normalizeIco(dto.customerIco),
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

    const computed = this.computeInvoiceTotals(dto.items);
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
      this.validateInvoiceNumber(invoiceNumber, issueDate);

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
            customerName: dto.customerName.trim(),
            customerIco: this.normalizeIco(dto.customerIco),
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

    const computed = this.computeInvoiceTotals(copiedItems);
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

  private validateReadyToIssue(
    invoice: Invoice & { items: InvoiceItem[] },
  ): void {
    if (invoice.items.length === 0) {
      throw new BadRequestException(
        'Invoice must have at least one item before issue',
      );
    }

    if (!invoice.taxClassification) {
      throw new BadRequestException(
        'Tax classification is required before issue',
      );
    }

    if (
      (invoice.taxClassification === 'eu_service' ||
        invoice.taxClassification === 'eu_goods') &&
      !invoice.customerDic
    ) {
      throw new BadRequestException(
        'Customer DIC is required for EU tax classification',
      );
    }
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

    this.validateReadyToIssue(current);

    if (current.invoiceNumber) {
      this.validateInvoiceNumber(current.invoiceNumber, current.issueDate);
    }

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
              supplierSnapshot: this.buildSupplierSnapshot(subject),
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

  async markInvoiceUnpaid(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const subject = await this.getSubjectByUserOrThrow(userId);
    const current = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);

    if (current.status !== 'paid') {
      throw new ConflictException(
        'Only paid invoice can be marked as unpaid',
      );
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
    const current = await this.getInvoiceBySubjectOrThrow(subject.id, invoiceId);

    if (current.status === 'cancelled') {
      throw new ConflictException('Cancelled invoice cannot be edited');
    }

    const invoiceNumber = this.normalizeInvoiceNumber(dto.invoiceNumber);
    if (!invoiceNumber) {
      throw new BadRequestException('Invoice number is required');
    }
    this.validateInvoiceNumber(invoiceNumber, current.issueDate);

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

    const effectiveStatus = this.toEffectiveStatus(
      invoice.status,
      invoice.dueDate,
    );
    if (invoice.status === 'draft' || invoice.status === 'cancelled') {
      throw new ConflictException(
        'PDF export is allowed only for issued or paid invoices',
      );
    }

    const supplier = this.getSupplierSnapshotForPdf(invoice);
    const iban = this.toCzIban(
      supplier.bankAccountPrefix,
      supplier.bankAccountNumber,
      supplier.bankCode,
    );
    const spdPayload = this.buildSpdPayload(
      iban,
      invoice.totalWithVat.toString(),
      invoice.variableSymbol,
    );
    const qrDataUrl = await QRCode.toDataURL(spdPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
    });

    const payloadHash = this.createPdfHash({
      invoice,
      supplier,
      spdPayload,
    });

    const exportData = await this.prisma.$transaction(async (tx) => {
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

      return { nextVersion };
    });

    const pdfBuffer = await this.renderPdf({
      invoice,
      supplier,
      qrDataUrl,
      iban,
    });

    const filePrefix = invoice.invoiceNumber ?? invoice.id;
    const statusSuffix = effectiveStatus === 'overdue' ? '-overdue' : '';
    return {
      fileName: `faktura-${filePrefix}${statusSuffix}-v${exportData.nextVersion}.pdf`,
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
