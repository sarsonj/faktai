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

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsString()
  @Matches(/^\d{8}$/)
  ico!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dic?: string;

  @IsBoolean()
  isVatPayer!: boolean;

  @IsOptional()
  @IsDateString()
  vatRegistrationDate?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @Matches(/^\d{3}\s?\d{2}$/)
  postalCode!: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,6}$/)
  bankAccountPrefix?: string;

  @IsString()
  @Matches(/^\d{2,10}$/)
  bankAccountNumber!: string;

  @IsString()
  @Matches(/^\d{4}$/)
  bankCode!: string;

  @IsEnum(DefaultVariableSymbolType)
  defaultVariableSymbolType!: DefaultVariableSymbolType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}$/)
  defaultVariableSymbolValue?: string;

  @IsInt()
  @Min(1)
  @Max(90)
  defaultDueDays!: number;
}
