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
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import type { RequestWithUser } from '../auth/session-auth.guard';
import { ChangeInvoiceNumberDto } from './dto/change-invoice-number.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { MarkInvoicePaidDto } from './dto/invoice-item.dto';
import { ReserveInvoiceNumberDto } from './dto/reserve-invoice-number.dto';
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto';
import { InvoiceService } from './invoice.service';

@UseGuards(SessionAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async listInvoices(
    @Req() request: RequestWithUser,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoiceService.listInvoices(request.user!.id, query);
  }

  /**
   * Vytvoří koncept faktury. S `?issue=true` ji rovnou vystaví.
   * Podporuje hlavičku `Idempotency-Key`.
   */
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async createInvoice(
    @Req() request: RequestWithUser,
    @Body() dto: UpsertInvoiceDto,
    @Query('issue') issue?: string,
  ) {
    if (issue === 'true' || issue === '1') {
      return this.invoiceService.createAndIssue(request.user!.id, dto);
    }
    return this.invoiceService.createDraft(request.user!.id, dto);
  }

  @Get('by-number/:invoiceNumber')
  async getInvoiceByNumber(
    @Req() request: RequestWithUser,
    @Param('invoiceNumber') invoiceNumber: string,
  ) {
    return this.invoiceService.getInvoiceDetailByNumber(
      request.user!.id,
      invoiceNumber,
    );
  }

  @Post('reserve-number')
  async reserveInvoiceNumber(
    @Req() request: RequestWithUser,
    @Body() dto: ReserveInvoiceNumberDto,
  ) {
    return this.invoiceService.reserveInvoiceNumber(
      request.user!.id,
      dto.issueDate,
    );
  }

  @Post(':id/copy')
  @UseInterceptors(IdempotencyInterceptor)
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
    return this.invoiceService.markInvoicePaid(
      request.user!.id,
      id,
      dto.paidAt,
    );
  }

  @Post(':id/mark-unpaid')
  async markInvoiceUnpaid(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.markInvoiceUnpaid(request.user!.id, id);
  }

  @Patch(':id/number')
  async changeInvoiceNumber(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: ChangeInvoiceNumberDto,
  ) {
    return this.invoiceService.changeInvoiceNumber(request.user!.id, id, dto);
  }

  @Post(':id/refresh-supplier-snapshot')
  async refreshSupplierSnapshot(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.refreshSupplierSnapshot(request.user!.id, id);
  }

  @Get(':id/pdf')
  async exportInvoicePdf(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const pdf = await this.invoiceService.exportInvoicePdf(
      request.user!.id,
      id,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdf.fileName}"`,
    );
    response.send(pdf.content);
  }

  /** QR platba vystavené faktury – SPD payload, platební údaje a SVG (CR-0062). */
  @Get(':id/payment-qr')
  async getPaymentQr(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.invoiceService.getPaymentQr(request.user!.id, id);
  }

  @Get(':id')
  async getInvoice(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.invoiceService.getInvoiceDetail(request.user!.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteInvoice(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invoiceService.deleteInvoice(request.user!.id, id);
  }
}
