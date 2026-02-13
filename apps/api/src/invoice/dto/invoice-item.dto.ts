import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString({ message: 'Popis položky musí být text.' })
  @MinLength(1, { message: 'Popis položky je povinný.' })
  @MaxLength(255, { message: 'Popis položky může mít maximálně 255 znaků.' })
  description!: string;

  @IsString({ message: 'Množství položky musí být text.' })
  @Matches(/^\d+(\.\d{1,3})?$/, {
    message: 'Množství položky musí být číslo s maximálně 3 desetinnými místy.',
  })
  quantity!: string;

  @IsString({ message: 'Jednotka musí být text.' })
  @MinLength(1, { message: 'Jednotka je povinná.' })
  @MaxLength(20, { message: 'Jednotka může mít maximálně 20 znaků.' })
  unit!: string;

  @IsString({ message: 'Cena položky musí být text.' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Cena položky musí být číslo s maximálně 2 desetinnými místy.',
  })
  unitPrice!: string;

  @Transform(({ value }) => Number(value))
  @IsIn([0, 12, 21], { message: 'Sazba DPH musí být 0, 12 nebo 21.' })
  vatRate!: number;
}

export class InvoiceItemsContainerDto {
  @IsArray({ message: 'Položky musí být pole.' })
  @ArrayMinSize(1, { message: 'Je potřeba alespoň jedna položka.' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}

export class MarkInvoicePaidDto {
  @IsOptional()
  @IsString({ message: 'Datum úhrady musí být text.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum úhrady musí být ve formátu YYYY-MM-DD.',
  })
  paidAt?: string;
}
