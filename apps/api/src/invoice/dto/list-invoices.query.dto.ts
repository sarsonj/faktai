import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsIn(['all', 'paid', 'unpaid', 'overdue'])
  status?: 'all' | 'paid' | 'unpaid' | 'overdue';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsIn([10, 20, 50])
  pageSize?: number;
}
