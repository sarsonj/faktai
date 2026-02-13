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

    throw new BadRequestException(
      'Subject does not have default variable symbol configured',
    );
  }

  private resolveVariableSymbol(
    subject: Subject,
    dto: UpsertInvoiceDto,
  ): string {
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

  private async renderPdf(input: {
    invoice: Invoice & { items: InvoiceItem[] };
    supplier: SupplierSnapshot;
    qrDataUrl: string;
    iban: string;
  }): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
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

      const left = doc.page.margins.left;
      const top = doc.page.margins.top;
      const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const right = left + contentWidth;
      const mid = left + contentWidth / 2;

      const supplierName = input.supplier.businessName
        ? input.supplier.businessName
        : `${input.supplier.firstName} ${input.supplier.lastName}`;
      const invoiceNumber = input.invoice.invoiceNumber ?? input.invoice.id.slice(0, 8);

      doc.fontSize(10).fillColor('#111111');
      doc.font('Helvetica-Bold').text('Dodavatel', left, top);
      doc.font('Helvetica').fontSize(9).text(supplierName, left, top + 16);
      doc.text(input.supplier.street, left, top + 30);
      doc.text(`${input.supplier.postalCode} ${input.supplier.city}`, left, top + 44);
      doc.text(input.supplier.countryCode === 'CZ' ? 'Česká republika' : input.supplier.countryCode, left, top + 58);
      doc.text(
        `IČ: ${input.supplier.ico}${input.supplier.dic ? `    DIČ: ${input.supplier.dic}` : ''}`,
        left,
        top + 74,
      );

      doc.moveTo(mid - 10, top).lineTo(mid - 10, top + 170).strokeColor('#d9d9d9').stroke();

      doc.font('Helvetica-Bold').fontSize(16).text('Faktura - daňový doklad', mid + 20, top + 4);
      doc.rect(right - 110, top, 90, 28).fill('#eeeeee');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(12).text(invoiceNumber, right - 80, top + 8);
      this.drawPseudoBarcode(doc, right - 102, top + 34, 84, invoiceNumber);

      doc.font('Helvetica-Bold').fontSize(10).text('Odběratel', mid + 20, top + 98);
      doc.font('Helvetica').fontSize(9).text(input.invoice.customerName, mid + 20, top + 114);
      doc.text(input.invoice.customerStreet, mid + 20, top + 128);
      doc.text(
        `${input.invoice.customerPostalCode} ${input.invoice.customerCity}`,
        mid + 20,
        top + 142,
      );
      doc.text(
        input.invoice.customerCountryCode === 'CZ' ? 'Česká republika' : input.invoice.customerCountryCode,
        mid + 20,
        top + 156,
      );
      const customerIdLine = [
        input.invoice.customerIco ? `IČ: ${input.invoice.customerIco}` : '',
        input.invoice.customerDic ? `DIČ: ${input.invoice.customerDic}` : '',
      ]
        .filter(Boolean)
        .join('    ');
      if (customerIdLine) {
        doc.text(customerIdLine, mid + 20, top + 170);
      }

      let y = top + 205;
      doc.font('Helvetica').fontSize(9);
      doc.text('Způsob úhrady:', left, y);
      doc.font('Helvetica-Bold').text('Převodem', left + 74, y);
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

      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Bankovní účet', left + 6, paymentTableTop + 6);
      doc.text('Symbol', left + col1Width + 6, paymentTableTop + 6);
      doc.text('Datum', left + col1Width + col2Width + 6, paymentTableTop + 6);

      doc.font('Helvetica').fontSize(9);
      doc.text(this.formatSupplierBankAccount(input.supplier), left + 6, paymentTableTop + 28);
      doc.text(`IBAN: ${input.iban}`, left + 6, paymentTableTop + 42);
      doc.text('SWIFT: -', left + 6, paymentTableTop + 56);

      doc.text('variabilní:', left + col1Width + 6, paymentTableTop + 28);
      doc.font('Helvetica-Bold').text(input.invoice.variableSymbol, left + col1Width + 54, paymentTableTop + 28);
      doc.font('Helvetica').text('konstantní:', left + col1Width + 6, paymentTableTop + 42);
      doc.font('Helvetica-Bold').text('0308', left + col1Width + 54, paymentTableTop + 42);

      doc.font('Helvetica').text('vystavení:', left + col1Width + col2Width + 6, paymentTableTop + 28);
      doc.font('Helvetica-Bold').text(
        this.formatDateCz(input.invoice.issueDate),
        left + col1Width + col2Width + 56,
        paymentTableTop + 28,
      );
      doc.font('Helvetica').text('splatnosti:', left + col1Width + col2Width + 6, paymentTableTop + 42);
      doc.font('Helvetica-Bold').text(
        this.formatDateCz(input.invoice.dueDate),
        left + col1Width + col2Width + 56,
        paymentTableTop + 42,
      );
      doc.font('Helvetica').text('DUZP:', left + col1Width + col2Width + 6, paymentTableTop + 56);
      doc.font('Helvetica-Bold').text(
        this.formatDateCz(input.invoice.taxableSupplyDate),
        left + col1Width + col2Width + 56,
        paymentTableTop + 56,
      );

      y = paymentTableTop + paymentTableHeight + 14;
      doc.font('Helvetica').fontSize(9).fillColor('#222222').text(
        `Fakturujeme: ${input.invoice.note ?? input.invoice.items[0]?.description ?? ''}`,
        left,
        y,
      );

      y += 18;
      const itemHeaderHeight = 18;
      const itemRowHeight = 18;
      const cols = [230, 52, 68, 44, 70, 58, 66];
      const itemHeaders = ['Označení dodávky', 'Počet m.j.', 'Cena za m.j.', 'DPH %', 'Bez DPH', 'DPH', 'Celkem'];

      doc.rect(left, y, contentWidth, itemHeaderHeight).fill('#f3f3f3');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(8);
      let cx = left + 4;
      for (let i = 0; i < itemHeaders.length; i += 1) {
        doc.text(itemHeaders[i], cx, y + 6, { width: cols[i] - 8, align: i === 0 ? 'left' : 'right' });
        cx += cols[i];
      }
      y += itemHeaderHeight;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#d4d4d4').stroke();

      doc.font('Helvetica').fontSize(8.5).fillColor('#111111');
      const sortedItems = [...input.invoice.items].sort((a, b) => a.position - b.position);
      for (const item of sortedItems) {
        cx = left + 4;
        doc.text(item.description, cx, y + 5, { width: cols[0] - 8 });
        cx += cols[0];
        doc.text(item.quantity.toString(), cx, y + 5, { width: cols[1] - 8, align: 'right' });
        cx += cols[1];
        doc.text(item.unitPrice.toString(), cx, y + 5, { width: cols[2] - 8, align: 'right' });
        cx += cols[2];
        doc.text(String(item.vatRate), cx, y + 5, { width: cols[3] - 8, align: 'right' });
        cx += cols[3];
        doc.text(this.formatMoney(item.lineTotalWithoutVat.toString()), cx, y + 5, { width: cols[4] - 8, align: 'right' });
        cx += cols[4];
        doc.text(this.formatMoney(item.lineVatAmount.toString()), cx, y + 5, { width: cols[5] - 8, align: 'right' });
        cx += cols[5];
        doc.font('Helvetica-Bold').text(this.formatMoney(item.lineTotalWithVat.toString()), cx, y + 5, {
          width: cols[6] - 8,
          align: 'right',
        });
        doc.font('Helvetica');
        y += itemRowHeight;
        doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e5e5').stroke();
      }

      y += 10;
      doc.image(qrImage, left, y, { width: 95, height: 95 });
      doc.font('Helvetica-Bold').fontSize(10).text('QR Platba+F', left + 2, y + 100);

      const vatTableX = left + 210;
      const vatTableY = y + 8;
      const vatTableW = contentWidth - 210;
      const vatHeaderH = 16;
      const vatRowH = 16;
      const vatCols = [80, 90, 90, vatTableW - 260];
      doc.rect(vatTableX, vatTableY, vatTableW, vatHeaderH).fill('#f3f3f3');
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(8);
      let vx = vatTableX + 4;
      for (const [index, heading] of ['Sazba DPH', 'Základ', 'Výše DPH', 'Celkem'].entries()) {
        doc.text(heading, vx, vatTableY + 5, { width: vatCols[index] - 8, align: index === 0 ? 'left' : 'right' });
        vx += vatCols[index];
      }

      const vatRows = this.buildVatRows(sortedItems);
      let vy = vatTableY + vatHeaderH;
      doc.font('Helvetica').fontSize(8.5);
      for (const row of vatRows) {
        vx = vatTableX + 4;
        doc.text(`${row.rate} %`, vx, vy + 5, { width: vatCols[0] - 8 });
        vx += vatCols[0];
        doc.text(this.formatMoney(row.base), vx, vy + 5, { width: vatCols[1] - 8, align: 'right' });
        vx += vatCols[1];
        doc.text(this.formatMoney(row.vat), vx, vy + 5, { width: vatCols[2] - 8, align: 'right' });
        vx += vatCols[2];
        doc.font('Helvetica-Bold').text(this.formatMoney(row.total), vx, vy + 5, {
          width: vatCols[3] - 8,
          align: 'right',
        });
        doc.font('Helvetica');
        vy += vatRowH;
        doc.moveTo(vatTableX, vy).lineTo(vatTableX + vatTableW, vy).strokeColor('#e5e5e5').stroke();
      }

      vx = vatTableX + 4;
      doc.font('Helvetica-Bold').text('CELKEM', vx, vy + 5, { width: vatCols[0] - 8 });
      vx += vatCols[0];
      doc.text(this.formatMoney(input.invoice.totalWithoutVat.toString()), vx, vy + 5, { width: vatCols[1] - 8, align: 'right' });
      vx += vatCols[1];
      doc.text(this.formatMoney(input.invoice.totalVat.toString()), vx, vy + 5, { width: vatCols[2] - 8, align: 'right' });
      vx += vatCols[2];
      doc.text(this.formatMoney(input.invoice.totalWithVat.toString()), vx, vy + 5, { width: vatCols[3] - 8, align: 'right' });

      vy += vatRowH + 10;
      doc.font('Helvetica-Bold').fontSize(14).text(
        `Celkem k úhradě:  ${this.formatMoney(input.invoice.totalWithVat.toString())}`,
        vatTableX,
        vy,
        { width: vatTableW, align: 'right' },
      );

      if (input.invoice.note) {
        doc.font('Helvetica').fontSize(9).fillColor('#333333').text(`Poznámka: ${input.invoice.note}`, left, Math.max(vy + 24, y + 118));
      }

      const footerY = doc.page.height - 42;
      doc.moveTo(left, footerY - 12).lineTo(right, footerY - 12).strokeColor('#d8d8d8').stroke();
      doc.fillColor('#555555').font('Helvetica').fontSize(7.5);
      doc.text(
        `Vytiskl(a): ${input.supplier.firstName} ${input.supplier.lastName}, ${this.formatDateCz(new Date())}`,
        left,
        footerY,
      );
      doc.text('Vystaveno v online fakturační službě iDoklad', left + 200, footerY, {
        width: 220,
        align: 'center',
      });
      doc.text('Strana 1/1', right - 70, footerY, { width: 70, align: 'right' });

      doc.end();
    });
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

    if (current.status === 'paid' || current.status === 'cancelled') {
      throw new ConflictException('Paid or cancelled invoice cannot be edited');
    }

    const computed = this.computeInvoiceTotals(dto.items);
    const { issueDate, taxableSupplyDate, dueDate } = this.resolveInvoiceDates(
      subject,
      dto,
    );
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

        invoiceNumber = this.formatInvoiceNumber(
          issueYear,
          sequence.currentValue,
        );
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
