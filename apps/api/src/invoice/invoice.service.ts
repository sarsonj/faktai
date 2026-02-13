import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';

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

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  private toEffectiveStatus(status: 'draft' | 'issued' | 'paid' | 'cancelled', dueDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (status === 'issued' && dueDate < today) {
      return 'overdue' as const;
    }
    return status;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
      items: rows.map((row) => ({
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
      })),
      total,
      page,
      pageSize,
    };
  }
}
