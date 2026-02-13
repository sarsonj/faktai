import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { RequestWithUser } from '../auth/session-auth.guard';
import { ListTaxRunsQueryDto } from './dto/list-tax-runs.query.dto';
import { TaxReportRequestDto } from './dto/tax-report-request.dto';
import { TaxReportsService } from './tax-reports.service';

@UseGuards(SessionAuthGuard)
@Controller('tax-reports')
export class TaxReportsController {
  constructor(private readonly taxReportsService: TaxReportsService) {}

  @Post('preview')
  async preview(@Req() request: RequestWithUser, @Body() dto: TaxReportRequestDto) {
    return this.taxReportsService.preview(request.user!.id, dto);
  }

  @Post('export')
  async export(
    @Req() request: RequestWithUser,
    @Body() dto: TaxReportRequestDto,
    @Res() response: Response,
  ) {
    const result = await this.taxReportsService.export(request.user!.id, dto);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    response.send(result.xml);
  }

  @Get('runs')
  async listRuns(@Req() request: RequestWithUser, @Query() query: ListTaxRunsQueryDto) {
    return this.taxReportsService.listRuns(request.user!.id, query);
  }
}
