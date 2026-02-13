import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { RequestWithUser } from '../auth/session-auth.guard';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { MarkInvoicePaidDto } from './dto/invoice-item.dto';
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto';
import { InvoiceService } from './invoice.service';

@UseGuards(SessionAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async listInvoices(@Req() request: RequestWithUser, @Query() query: ListInvoicesQueryDto) {
    return this.invoiceService.listInvoices(request.user!.id, query);
  }

  @Get(':id')
  async getInvoice(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.invoiceService.getInvoiceDetail(request.user!.id, id);
  }

  @Post()
  async createInvoice(@Req() request: RequestWithUser, @Body() dto: UpsertInvoiceDto) {
    return this.invoiceService.createDraft(request.user!.id, dto);
  }

  @Post(':id/copy')
  async copyInvoice(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.invoiceService.copyInvoice(request.user!.id, id);
  }

  @Patch(':id')
  async updateInvoice(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpsertInvoiceDto,
  ) {
    return this.invoiceService.updateInvoice(request.user!.id, id, dto);
  }

  @Post(':id/issue')
  async issueInvoice(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.invoiceService.issueInvoice(request.user!.id, id);
  }

  @Post(':id/mark-paid')
  async markInvoicePaid(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: MarkInvoicePaidDto,
  ) {
    return this.invoiceService.markInvoicePaid(request.user!.id, id, dto.paidAt);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteInvoice(@Req() request: RequestWithUser, @Param('id') id: string): Promise<void> {
    return this.invoiceService.deleteInvoice(request.user!.id, id);
  }
}
