import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangeInvoiceNumberDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Číslo faktury musí být text.' })
  @MinLength(1, { message: 'Číslo faktury nesmí být prázdné.' })
  invoiceNumber!: string;

  @IsOptional()
  @IsBoolean({
    message: 'Pole pro synchronizaci variabilního symbolu musí být ano/ne.',
  })
  syncVariableSymbol?: boolean;
}
