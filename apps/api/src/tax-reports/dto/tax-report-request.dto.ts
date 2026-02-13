import { TaxPeriodType, TaxReportType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

export class TaxReportRequestDto {
  @IsEnum(TaxReportType)
  reportType!: TaxReportType;

  @IsEnum(TaxPeriodType)
  periodType!: TaxPeriodType;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  value!: number;
}
