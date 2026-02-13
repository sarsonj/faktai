import { PaymentMethod, TaxClassification } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { InvoiceItemDto } from './invoice-item.dto';

export class UpsertInvoiceDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}$/)
  variableSymbol?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  taxableSupplyDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(TaxClassification)
  taxClassification?: TaxClassification;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  customerName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/)
  customerIco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerDic?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  customerStreet!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customerCity!: string;

  @IsString()
  @Matches(/^\d{3}\s?\d{2}$/)
  customerPostalCode!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  customerCountryCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}
