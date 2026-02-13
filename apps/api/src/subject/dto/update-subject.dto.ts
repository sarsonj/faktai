import { DefaultVariableSymbolType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/)
  ico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dic?: string;

  @IsOptional()
  @IsBoolean()
  isVatPayer?: boolean;

  @IsOptional()
  @IsDateString()
  vatRegistrationDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  street?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\s?\d{2}$/)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,6}$/)
  bankAccountPrefix?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2,10}$/)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/)
  bankCode?: string;

  @IsOptional()
  @IsEnum(DefaultVariableSymbolType)
  defaultVariableSymbolType?: DefaultVariableSymbolType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}$/)
  defaultVariableSymbolValue?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  defaultDueDays?: number;
}
