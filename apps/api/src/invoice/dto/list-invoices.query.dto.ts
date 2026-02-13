import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsIn(['all', 'paid', 'unpaid', 'overdue'], {
    message: 'Filtr stavu má neplatnou hodnotu.',
  })
  status?: 'all' | 'paid' | 'unpaid' | 'overdue';

  @IsOptional()
  @IsString({ message: 'Vyhledávací dotaz musí být text.' })
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Stránka musí být celé číslo.' })
  @Min(1, { message: 'Stránka musí být alespoň 1.' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Počet položek na stránce musí být celé číslo.' })
  @IsIn([10, 20, 50], {
    message: 'Počet položek na stránce musí být 10, 20 nebo 50.',
  })
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Rok musí být celé číslo.' })
  @Min(2000, { message: 'Rok musí být alespoň 2000.' })
  @Max(2100, { message: 'Rok musí být nejvýše 2100.' })
  year?: number;
}
