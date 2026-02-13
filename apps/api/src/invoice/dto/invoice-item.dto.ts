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
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,3})?$/)
  quantity!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  unitPrice!: string;

  @Transform(({ value }) => Number(value))
  @IsIn([0, 12, 21])
  vatRate!: number;
}

export class InvoiceItemsContainerDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}

export class MarkInvoicePaidDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paidAt?: string;
}
