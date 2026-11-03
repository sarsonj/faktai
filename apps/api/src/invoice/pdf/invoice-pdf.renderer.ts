import { Injectable } from '@nestjs/common';
import { Invoice, InvoiceItem } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  NON_VAT_PAYER_INVOICE_NOTE,
  VAT_REGIME_INVOICE_NOTES,
} from '../../tax/vat-regime';
import { formatDateOnlyCz, todayDateOnly } from '../../utils/date-only';
import { buildVatRows } from '../domain/invoice-calculation';
import { SupplierSnapshot } from '../domain/supplier-snapshot';

type PdfFontNames = {
  regular: string;
  bold: string;
};

/** Otisk obsahu PDF – mění se jen při změně dat, která PDF zobrazuje (verzování PDF). */
export function createInvoicePdfHash(input: {
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

export function sanitizeFileToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-z_-]/g, '-')
    .replace(/-+/g, '-');
}

/** Vykreslení PDF faktury (pdfkit). */
@Injectable()
export class InvoicePdfRenderer {
  private formatMoney(value: string): string {
    const numeric = Number(value);
    return `${numeric.toLocaleString('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Kč`;
  }

  private formatDateCz(value: Date): string {
    return formatDateOnlyCz(value);
  }

  private formatSupplierBankAccount(supplier: SupplierSnapshot): string {
    return supplier.bankAccountPrefix
      ? `${supplier.bankAccountPrefix}-${supplier.bankAccountNumber}/${supplier.bankCode}`
      : `${supplier.bankAccountNumber}/${supplier.bankCode}`;
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

  async render(input: {
    invoice: Invoice & { items: InvoiceItem[] };
    supplier: SupplierSnapshot;
    qrDataUrl: string;
    iban: string;
  }): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      bufferPages: true,
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
      const contentWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const right = left + contentWidth;
      const colGap = 20;
      const colWidth = (contentWidth - colGap) / 2;
      const rightColX = left + colWidth + colGap;

      const supplierName = input.supplier.businessName
        ? input.supplier.businessName
        : `${input.supplier.firstName} ${input.supplier.lastName}`;
      const invoiceNumber =
        input.invoice.invoiceNumber ?? input.invoice.id.slice(0, 8);

      this.drawSingleLine(
        doc,
        'Dodavatel',
        left,
        top,
        colWidth,
        fonts.bold,
        10,
      );
      this.drawSingleLine(
        doc,
        supplierName,
        left,
        top + 16,
        colWidth,
        fonts.regular,
      );
      this.drawSingleLine(
        doc,
        input.supplier.street,
        left,
        top + 30,
        colWidth,
        fonts.regular,
      );
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
        input.supplier.countryCode === 'CZ'
          ? 'Česká republika'
          : input.supplier.countryCode,
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

      const showVat = input.supplier.isVatPayer;
      this.drawSingleLine(
        doc,
        showVat ? 'Faktura - daňový doklad' : 'Faktura',
        rightColX,
        top + 4,
        colWidth - 104,
        fonts.bold,
        16,
      );
      doc.rect(right - 94, top, 94, 28).fill('#eeeeee');
      this.drawSingleLine(
        doc,
        invoiceNumber,
        right - 90,
        top + 8,
        86,
        fonts.bold,
        12,
        'center',
      );

      this.drawSingleLine(
        doc,
        'Odběratel',
        rightColX,
        top + 98,
        colWidth,
        fonts.bold,
        10,
      );
      this.drawSingleLine(
        doc,
        input.invoice.customerName,
        rightColX,
        top + 114,
        colWidth,
        fonts.regular,
      );
      this.drawSingleLine(
        doc,
        input.invoice.customerStreet,
        rightColX,
        top + 128,
        colWidth,
        fonts.regular,
      );
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
        input.invoice.customerCountryCode === 'CZ'
          ? 'Česká republika'
          : input.invoice.customerCountryCode,
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
        this.drawSingleLine(
          doc,
          customerIdLine,
          rightColX,
          top + 170,
          colWidth,
          fonts.regular,
        );
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
      doc
        .rect(left, paymentTableTop, contentWidth, paymentTableHeight)
        .strokeColor('#d4d4d4')
        .stroke();
      doc
        .moveTo(left + col1Width, paymentTableTop)
        .lineTo(left + col1Width, paymentTableTop + paymentTableHeight)
        .stroke();
      doc
        .moveTo(left + col1Width + col2Width, paymentTableTop)
        .lineTo(
          left + col1Width + col2Width,
          paymentTableTop + paymentTableHeight,
        )
        .stroke();
      doc
        .moveTo(left, paymentTableTop + 20)
        .lineTo(right, paymentTableTop + 20)
        .stroke();

      this.drawSingleLine(
        doc,
        'Bankovní účet',
        left + 6,
        paymentTableTop + 6,
        col1Width - 12,
        fonts.bold,
        9,
      );
      this.drawSingleLine(
        doc,
        'Symbol',
        left + col1Width + 6,
        paymentTableTop + 6,
        col2Width - 12,
        fonts.bold,
        9,
      );
      this.drawSingleLine(
        doc,
        'Datum',
        left + col1Width + col2Width + 6,
        paymentTableTop + 6,
        col3Width - 12,
        fonts.bold,
        9,
      );

      this.drawSingleLine(
        doc,
        this.formatSupplierBankAccount(input.supplier),
        left + 6,
        paymentTableTop + 28,
        col1Width - 12,
        fonts.regular,
        9,
      );
      this.drawSingleLine(
        doc,
        `IBAN: ${input.iban}`,
        left + 6,
        paymentTableTop + 42,
        col1Width - 12,
        fonts.regular,
        9,
      );

      this.drawSingleLine(
        doc,
        'variabilní:',
        left + col1Width + 6,
        paymentTableTop + 28,
        52,
        fonts.regular,
        9,
      );
      this.drawSingleLine(
        doc,
        input.invoice.variableSymbol,
        left + col1Width + 58,
        paymentTableTop + 28,
        col2Width - 64,
        fonts.bold,
        9,
      );
      this.drawSingleLine(
        doc,
        'konstantní:',
        left + col1Width + 6,
        paymentTableTop + 42,
        52,
        fonts.regular,
        9,
      );
      this.drawSingleLine(
        doc,
        '0308',
        left + col1Width + 58,
        paymentTableTop + 42,
        col2Width - 64,
        fonts.bold,
        9,
      );

      this.drawSingleLine(
        doc,
        'vystavení:',
        left + col1Width + col2Width + 6,
        paymentTableTop + 28,
        52,
        fonts.regular,
        9,
      );
      this.drawSingleLine(
        doc,
        this.formatDateCz(input.invoice.issueDate),
        left + col1Width + col2Width + 58,
        paymentTableTop + 28,
        col3Width - 64,
        fonts.bold,
        9,
      );
      this.drawSingleLine(
        doc,
        'splatnosti:',
        left + col1Width + col2Width + 6,
        paymentTableTop + 42,
        52,
        fonts.regular,
        9,
      );
      this.drawSingleLine(
        doc,
        this.formatDateCz(input.invoice.dueDate),
        left + col1Width + col2Width + 58,
        paymentTableTop + 42,
        col3Width - 64,
        fonts.bold,
        9,
      );
      this.drawSingleLine(
        doc,
        'DUZP:',
        left + col1Width + col2Width + 6,
        paymentTableTop + 56,
        52,
        fonts.regular,
        9,
      );
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
      const cols = showVat ? [170, 50, 64, 40, 72, 62, 65] : [283, 60, 90, 90];
      const itemHeaders = showVat
        ? [
            'Označení dodávky',
            'Počet m.j.',
            'Cena za m.j.',
            'DPH %',
            'Bez DPH',
            'DPH',
            'Celkem',
          ]
        : ['Označení dodávky', 'Počet m.j.', 'Cena za m.j.', 'Celkem'];
      // Spodní hranice obsahu stránky (nad patičkou).
      const pageBodyBottom = doc.page.height - doc.page.margins.bottom - 32;

      const drawItemHeader = () => {
        doc.rect(left, y, contentWidth, itemHeaderHeight).fill('#f3f3f3');
        let hx = left + 4;
        for (let i = 0; i < itemHeaders.length; i += 1) {
          this.drawSingleLine(
            doc,
            itemHeaders[i],
            hx,
            y + 6,
            cols[i] - 8,
            fonts.bold,
            8,
            i === 0 ? 'left' : 'right',
          );
          hx += cols[i];
        }
        y += itemHeaderHeight;
        doc.moveTo(left, y).lineTo(right, y).strokeColor('#d4d4d4').stroke();
      };

      const startContinuationPage = () => {
        doc.addPage();
        y = doc.page.margins.top;
        this.drawSingleLine(
          doc,
          `Faktura ${invoiceNumber} – pokračování`,
          left,
          y,
          contentWidth,
          fonts.bold,
          10,
        );
        y += 22;
      };

      drawItemHeader();

      const sortedItems = [...input.invoice.items].sort(
        (a, b) => a.position - b.position,
      );
      for (const item of sortedItems) {
        if (y + itemRowHeight > pageBodyBottom) {
          startContinuationPage();
          drawItemHeader();
        }
        const cells = showVat
          ? [
              item.description,
              item.quantity.toString(),
              item.unitPrice.toString(),
              String(item.vatRate),
              this.formatMoney(item.lineTotalWithoutVat.toString()),
              this.formatMoney(item.lineVatAmount.toString()),
              this.formatMoney(item.lineTotalWithVat.toString()),
            ]
          : [
              item.description,
              item.quantity.toString(),
              item.unitPrice.toString(),
              this.formatMoney(item.lineTotalWithVat.toString()),
            ];
        let cx = left + 4;
        cells.forEach((cell, index) => {
          const isLast = index === cells.length - 1;
          this.drawSingleLine(
            doc,
            cell,
            cx,
            y + 5,
            cols[index] - 8,
            isLast ? fonts.bold : fonts.regular,
            8.5,
            index === 0 ? 'left' : 'right',
          );
          cx += cols[index];
        });
        y += itemRowHeight;
        doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e5e5').stroke();
      }

      // Souhrn (QR + rekapitulace DPH + poznámka) se nedělí mezi stránky.
      const vatRows = buildVatRows(sortedItems);
      const vatHeaderH = 16;
      const vatRowH = 16;
      const vatBlockHeight = showVat
        ? 8 + vatHeaderH + vatRowH * (vatRows.length + 1) + 10 + 26
        : 40;
      const legalNotes: string[] = [];
      if (!showVat) {
        legalNotes.push(NON_VAT_PAYER_INVOICE_NOTE);
      } else if (input.invoice.taxClassification) {
        const regimeNote =
          VAT_REGIME_INVOICE_NOTES[input.invoice.taxClassification];
        if (regimeNote) {
          legalNotes.push(regimeNote);
        }
      }
      const summaryHeight =
        10 +
        Math.max(115, vatBlockHeight) +
        legalNotes.length * 16 +
        (input.invoice.note ? 20 : 0);
      if (y + summaryHeight > pageBodyBottom) {
        startContinuationPage();
      }

      y += 10;
      doc.image(qrImage, left, y, { width: 95, height: 95 });
      this.drawSingleLine(
        doc,
        'QR Platba',
        left + 2,
        y + 100,
        100,
        fonts.bold,
        10,
      );

      const vatTableX = left + 190;
      const vatTableY = y + 8;
      const vatTableW = contentWidth - 190;
      let vy = vatTableY;
      if (showVat) {
        const vatCols = [62, 88, 88, vatTableW - 238];
        doc.rect(vatTableX, vatTableY, vatTableW, vatHeaderH).fill('#f3f3f3');
        let vx = vatTableX + 4;
        for (const [index, heading] of [
          'Sazba DPH',
          'Základ',
          'Výše DPH',
          'Celkem',
        ].entries()) {
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

        vy = vatTableY + vatHeaderH;
        for (const row of vatRows) {
          vx = vatTableX + 4;
          this.drawSingleLine(
            doc,
            `${row.rate} %`,
            vx,
            vy + 5,
            vatCols[0] - 8,
            fonts.regular,
            8.5,
          );
          vx += vatCols[0];
          this.drawSingleLine(
            doc,
            this.formatMoney(row.base),
            vx,
            vy + 5,
            vatCols[1] - 8,
            fonts.regular,
            8.5,
            'right',
          );
          vx += vatCols[1];
          this.drawSingleLine(
            doc,
            this.formatMoney(row.vat),
            vx,
            vy + 5,
            vatCols[2] - 8,
            fonts.regular,
            8.5,
            'right',
          );
          vx += vatCols[2];
          this.drawSingleLine(
            doc,
            this.formatMoney(row.total),
            vx,
            vy + 5,
            vatCols[3] - 8,
            fonts.bold,
            8.5,
            'right',
          );
          vy += vatRowH;
          doc
            .moveTo(vatTableX, vy)
            .lineTo(vatTableX + vatTableW, vy)
            .strokeColor('#e5e5e5')
            .stroke();
        }

        vx = vatTableX + 4;
        this.drawSingleLine(
          doc,
          'CELKEM',
          vx,
          vy + 5,
          vatCols[0] - 8,
          fonts.bold,
          8.5,
        );
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
      }
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

      let noteY = Math.max(vy + 26, y + 120);
      for (const legalNote of legalNotes) {
        this.drawSingleLine(
          doc,
          legalNote,
          left,
          noteY,
          contentWidth,
          fonts.bold,
          9,
          'left',
          '#222222',
        );
        noteY += 16;
      }
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

      // Patička se strankováním na každé stránce.
      const range = doc.bufferedPageRange();
      const printedAt = this.formatDateCz(todayDateOnly());
      for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
        doc.switchToPage(range.start + pageIndex);
        const footerY = doc.page.height - doc.page.margins.bottom - 16;
        doc
          .moveTo(left, footerY - 12)
          .lineTo(right, footerY - 12)
          .strokeColor('#d8d8d8')
          .stroke();
        this.drawSingleLine(
          doc,
          `Vytiskl(a): ${input.supplier.firstName} ${input.supplier.lastName}, ${printedAt}`,
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
          'Vystaveno v aplikaci FaktAI',
          left + 200,
          footerY,
          220,
          fonts.regular,
          7.5,
          'center',
          '#555555',
        );
        this.drawSingleLine(
          doc,
          `Strana ${pageIndex + 1}/${range.count}`,
          right - 70,
          footerY,
          70,
          fonts.regular,
          7.5,
          'right',
          '#555555',
        );
      }

      doc.end();
    });
  }
}
