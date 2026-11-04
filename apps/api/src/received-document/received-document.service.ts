import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Prisma, Subject } from '@prisma/client';
import type { ReadStream } from 'node:fs';
import { basename } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOWED_ATTACHMENT_TYPES,
  AttachmentStorageService,
  MAX_ATTACHMENT_BYTES,
} from '../storage/attachment-storage.service';
import { normalizeVatId } from '../tax/vat-id';
import {
  computeReceivedDocument,
  validateReceivedDocument,
} from './domain/received-calculation';
import {
  ListReceivedDocumentsQueryDto,
  UpsertReceivedDocumentDto,
} from './dto/upsert-received-document.dto';
import {
  mapAttachment,
  mapReceivedDocument,
  type ReceivedDocumentView,
} from './received-document.mapper';
import { sqliteYearOf } from '../prisma/sqlite-sql';
import { matchesSearch } from '../utils/search';

const WITH_RELATIONS = { lines: true, attachments: true } as const;

/** Rozpozná typ souboru podle signatury (nespoléhá na Content-Type od klienta). */
export function detectContentType(content: Buffer): string | null {
  if (content.subarray(0, 5).toString('latin1') === '%PDF-')
    return 'application/pdf';
  if (
    content
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff)
    return 'image/jpeg';
  if (
    content.subarray(0, 4).toString('latin1') === 'RIFF' &&
    content.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (content.subarray(4, 12).toString('latin1').startsWith('ftypheic'))
    return 'image/heic';
  return null;
}

function dateOnly(value?: string): Date | null {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null;
}

@Injectable()
export class ReceivedDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AttachmentStorageService,
  ) {}

  private async subjectOf(userId: string): Promise<Subject> {
    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) throw new NotFoundException('Subjekt nebyl nalezen.');
    return subject;
  }

  private async findOwned(subjectId: string, id: string) {
    const row = await this.prisma.receivedDocument.findFirst({
      where: { id, subjectId },
      include: WITH_RELATIONS,
    });
    if (!row) throw new NotFoundException('Přijatý doklad nebyl nalezen.');
    return row;
  }

  /** DTO → data pro DB, včetně výpočtu a validace. */
  private toData(dto: UpsertReceivedDocumentDto, subject: Subject) {
    const taxableSupplyDate = dateOnly(dto.taxableSupplyDate)!;
    const deductionDate = dateOnly(dto.deductionDate) ?? taxableSupplyDate;
    const computed = computeReceivedDocument(dto.lines, dto.vatRegime);
    const supplierVatId = dto.supplierVatId
      ? normalizeVatId(dto.supplierVatId)
      : null;
    const reverseChargeCode =
      dto.vatRegime === 'domestic_reverse_charge'
        ? (dto.reverseChargeCode ?? null)
        : null;

    validateReceivedDocument(
      {
        vatRegime: dto.vatRegime,
        supplierVatId,
        reverseChargeCode,
        taxableSupplyDate,
        deductionDate,
        lines: computed.lines,
      },
      subject,
    );

    return {
      document: {
        documentNumber: dto.documentNumber,
        supplierName: dto.supplierName,
        supplierIco: dto.supplierIco ?? null,
        supplierVatId,
        supplierStreet: dto.supplierStreet ?? null,
        supplierCity: dto.supplierCity ?? null,
        supplierPostalCode: dto.supplierPostalCode ?? null,
        supplierCountryCode: dto.supplierCountryCode ?? 'CZ',
        description: dto.description ?? null,
        issueDate: dateOnly(dto.issueDate),
        taxableSupplyDate,
        deductionDate,
        dueDate: dateOnly(dto.dueDate),
        paidAt: dateOnly(dto.paidAt),
        vatRegime: dto.vatRegime,
        reverseChargeCode,
        totalWithoutVat: computed.totalWithoutVat,
        totalVat: computed.totalVat,
        totalPayable: computed.totalPayable,
        note: dto.note ?? null,
      },
      lines: computed.lines,
    };
  }

  async list(userId: string, query: ListReceivedDocumentsQueryDto) {
    const subject = await this.subjectOf(userId);
    const year =
      query.year && Number.isInteger(query.year)
        ? query.year
        : new Date().getUTCFullYear();
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReceivedDocumentWhereInput = {
      subjectId: subject.id,
      taxableSupplyDate: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    };
    const q = query.q?.trim();
    if (q) {
      // Hledání bez ohledu na velikost písmen a diakritiku řešíme v aplikaci (CR-0061).
      const candidates = await this.prisma.receivedDocument.findMany({
        where: { ...where },
        select: {
          id: true,
          documentNumber: true,
          supplierName: true,
          description: true,
        },
      });
      where.id = {
        in: candidates
          .filter((row) =>
            matchesSearch(
              [row.documentNumber, row.supplierName, row.description],
              q,
            ),
          )
          .map((row) => row.id),
      };
    }
    const [total, rows, years] = await Promise.all([
      this.prisma.receivedDocument.count({ where }),
      this.prisma.receivedDocument.findMany({
        where,
        include: WITH_RELATIONS,
        orderBy: [{ taxableSupplyDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.$queryRaw<Array<{ year: number }>>`
        SELECT DISTINCT ${sqliteYearOf('taxableSupplyDate')} AS year
        FROM "ReceivedDocument" WHERE "subjectId" = ${subject.id} ORDER BY year DESC`,
    ]);
    return {
      items: rows.map(mapReceivedDocument),
      total,
      page,
      pageSize,
      year,
      availableYears: years.map((row) => Number(row.year)),
    };
  }

  async get(userId: string, id: string): Promise<ReceivedDocumentView> {
    const subject = await this.subjectOf(userId);
    return mapReceivedDocument(await this.findOwned(subject.id, id));
  }

  async create(
    userId: string,
    dto: UpsertReceivedDocumentDto,
  ): Promise<ReceivedDocumentView> {
    const subject = await this.subjectOf(userId);
    const data = this.toData(dto, subject);
    const created = await this.prisma.receivedDocument.create({
      data: {
        ...data.document,
        subjectId: subject.id,
        lines: { create: data.lines },
      },
      include: WITH_RELATIONS,
    });
    return mapReceivedDocument(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpsertReceivedDocumentDto,
  ): Promise<ReceivedDocumentView> {
    const subject = await this.subjectOf(userId);
    await this.findOwned(subject.id, id);
    const data = this.toData(dto, subject);
    const updated = await this.prisma.receivedDocument.update({
      where: { id },
      data: { ...data.document, lines: { deleteMany: {}, create: data.lines } },
      include: WITH_RELATIONS,
    });
    return mapReceivedDocument(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const subject = await this.subjectOf(userId);
    const row = await this.findOwned(subject.id, id);
    await this.prisma.receivedDocument.delete({ where: { id: row.id } });
    await Promise.all(
      row.attachments.map((attachment) =>
        this.storage.remove(attachment.storageKey),
      ),
    );
  }

  async addAttachment(
    userId: string,
    id: string,
    file: { originalname: string; buffer: Buffer; size: number } | undefined,
  ) {
    const subject = await this.subjectOf(userId);
    const row = await this.findOwned(subject.id, id);
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Chybí soubor (pole „file“).');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new PayloadTooLargeException('Příloha může mít nejvýše 15 MB.');
    }
    const contentType = detectContentType(file.buffer);
    if (!contentType || !ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
      throw new UnsupportedMediaTypeException(
        'Povolené jsou přílohy PDF, PNG, JPEG, WEBP a HEIC.',
      );
    }
    const fileName =
      basename(Buffer.from(file.originalname, 'latin1').toString('utf8')).slice(
        0,
        200,
      ) || 'priloha';
    const storageKey = await this.storage.save(file.buffer);
    try {
      const attachment = await this.prisma.receivedDocumentAttachment.create({
        data: {
          documentId: row.id,
          fileName,
          contentType,
          size: file.size,
          storageKey,
        },
      });
      return mapAttachment(attachment);
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async openAttachment(
    userId: string,
    id: string,
    attachmentId: string,
  ): Promise<{
    fileName: string;
    contentType: string;
    size: number;
    stream: ReadStream;
  }> {
    const subject = await this.subjectOf(userId);
    const row = await this.findOwned(subject.id, id);
    const attachment = row.attachments.find((item) => item.id === attachmentId);
    if (!attachment) throw new NotFoundException('Příloha nebyla nalezena.');
    return {
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      size: attachment.size,
      stream: await this.storage.open(attachment.storageKey),
    };
  }

  async removeAttachment(
    userId: string,
    id: string,
    attachmentId: string,
  ): Promise<void> {
    const subject = await this.subjectOf(userId);
    const row = await this.findOwned(subject.id, id);
    const attachment = row.attachments.find((item) => item.id === attachmentId);
    if (!attachment) throw new NotFoundException('Příloha nebyla nalezena.');
    await this.prisma.receivedDocumentAttachment.delete({
      where: { id: attachment.id },
    });
    await this.storage.remove(attachment.storageKey);
  }
}
