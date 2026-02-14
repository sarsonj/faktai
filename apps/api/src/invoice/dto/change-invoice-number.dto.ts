import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ChangeInvoiceNumberDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'Číslo faktury musí být text.' })
  invoiceNumber!: string;

  @IsOptional()
  @IsBoolean({
    message: 'Pole pro synchronizaci variabilního symbolu musí být ano/ne.',
  })
  syncVariableSymbol?: boolean;
}
