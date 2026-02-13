import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class ChangeInvoiceNumberDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'Číslo faktury musí být text.' })
  @Matches(/^\d{5,10}$/, {
    message: 'Číslo faktury musí mít formát RRRR + pořadí (5 až 10 číslic).',
  })
  invoiceNumber!: string;

  @IsOptional()
  @IsBoolean({
    message: 'Pole pro synchronizaci variabilního symbolu musí být ano/ne.',
  })
  syncVariableSymbol?: boolean;
}
