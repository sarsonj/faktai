import { PaymentMethod, TaxClassification } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { InvoiceItemDto } from './invoice-item.dto';

export class UpsertInvoiceDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'Číslo faktury musí být text.' })
  @MinLength(1, { message: 'Číslo faktury nesmí být prázdné.' })
  invoiceNumber?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsOptional()
  @IsString({ message: 'Variabilní symbol musí být text.' })
  @Matches(/^\d{1,10}$/, {
    message: 'Variabilní symbol musí mít 1 až 10 číslic.',
  })
  variableSymbol?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Datum vystavení musí být platné datum.' })
  issueDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Datum zdanitelného plnění musí být platné datum.' },
  )
  taxableSupplyDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Datum splatnosti musí být platné datum.' })
  dueDate?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Platební metoda není podporovaná.' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(TaxClassification, { message: 'Daňová klasifikace není platná.' })
  taxClassification?: TaxClassification;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Název odběratele musí být text.' })
  @MinLength(1, { message: 'Název odběratele je povinný.' })
  @MaxLength(150, { message: 'Název odběratele může mít maximálně 150 znaků.' })
  customerName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsOptional()
  @IsString({ message: 'IČO odběratele musí být text.' })
  @Matches(/^\d{8}$/, {
    message: 'IČO odběratele musí obsahovat přesně 8 číslic.',
  })
  customerIco?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'DIČ odběratele musí být text.' })
  @MaxLength(20, { message: 'DIČ odběratele může mít maximálně 20 znaků.' })
  customerDic?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Ulice odběratele musí být text.' })
  @MinLength(1, { message: 'Ulice odběratele je povinná.' })
  @MaxLength(150, { message: 'Ulice odběratele může mít maximálně 150 znaků.' })
  customerStreet!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Město odběratele musí být text.' })
  @MinLength(1, { message: 'Město odběratele je povinné.' })
  @MaxLength(100, { message: 'Město odběratele může mít maximálně 100 znaků.' })
  customerCity!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'PSČ odběratele musí být text.' })
  @Matches(/^\d{3}\d{2}$/, { message: 'PSČ odběratele musí mít formát 12345.' })
  customerPostalCode!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
  )
  @IsString({ message: 'Kód země odběratele musí být text.' })
  @Matches(/^[A-Z]{2}$/, {
    message: 'Kód země odběratele musí být ve formátu ISO-2 (např. CZ).',
  })
  customerCountryCode!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'Poznámka musí být text.' })
  @MaxLength(2000, { message: 'Poznámka může mít maximálně 2000 znaků.' })
  note?: string;

  @IsArray({ message: 'Položky musí být pole.' })
  @ArrayMinSize(1, { message: 'Faktura musí obsahovat alespoň jednu položku.' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}
