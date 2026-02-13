import { TaxPeriodType, TaxReportType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListTaxRunsQueryDto {
  @IsOptional()
  @IsEnum(TaxReportType)
  reportType?: TaxReportType;

  @IsOptional()
  @IsEnum(TaxPeriodType)
  periodType?: TaxPeriodType;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  value?: number;
}
