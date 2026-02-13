import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { RequestWithUser } from '../auth/session-auth.guard';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { InvoiceService } from './invoice.service';

@UseGuards(SessionAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async listInvoices(@Req() request: RequestWithUser, @Query() query: ListInvoicesQueryDto) {
    return this.invoiceService.listInvoices(request.user!.id, query);
  }
}
