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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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

  @Get(':id/pdf')
  async exportInvoicePdf(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const pdf = await this.invoiceService.exportInvoicePdf(request.user!.id, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=\"${pdf.fileName}\"`,
    );
    response.send(pdf.content);
  }

  @Get(':id')
  async getInvoice(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.invoiceService.getInvoiceDetail(request.user!.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteInvoice(@Req() request: RequestWithUser, @Param('id') id: string): Promise<void> {
    return this.invoiceService.deleteInvoice(request.user!.id, id);
  }
}
