import { DefaultVariableSymbolType, TaxPeriodType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Jméno musí být text.' })
  @MinLength(1, { message: 'Jméno je povinné.' })
  @MaxLength(100, { message: 'Jméno může mít maximálně 100 znaků.' })
  firstName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Příjmení musí být text.' })
  @MinLength(1, { message: 'Příjmení je povinné.' })
  @MaxLength(100, { message: 'Příjmení může mít maximálně 100 znaků.' })
  lastName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'Obchodní název musí být text.' })
  @MaxLength(150, { message: 'Obchodní název může mít maximálně 150 znaků.' })
  businessName?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'IČO musí být text.' })
  @Matches(/^\d{8}$/, { message: 'IČO musí obsahovat přesně 8 číslic.' })
  ico!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'DIČ musí být text.' })
  @MaxLength(20, { message: 'DIČ může mít maximálně 20 znaků.' })
  dic?: string;

  @IsBoolean({ message: 'Pole plátce DPH musí být ano/ne.' })
  isVatPayer!: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Datum registrace DPH musí být platné datum.' })
  vatRegistrationDate?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsOptional()
  @IsString({ message: 'Místní příslušnost FÚ musí být text.' })
  @Matches(/^\d{4}$/, {
    message: 'Místní příslušnost FÚ musí mít 4 číslice.',
  })
  taxOfficePracufo?: string;

  @IsOptional()
  @IsEnum(TaxPeriodType, {
    message: 'Periodicita DPH musí být month nebo quarter.',
  })
  vatPeriodType?: TaxPeriodType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'Telefon pro FÚ musí být text.' })
  @Matches(/^[0-9+()\-\s]{6,25}$/, {
    message:
      'Telefon pro FÚ může obsahovat pouze číslice, mezery a znaky + ( ) - (6 až 25 znaků).',
  })
  contactPhone?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsEmail({}, { message: 'E-mail pro FÚ musí být platná e-mailová adresa.' })
  @MaxLength(255, { message: 'E-mail pro FÚ může mít maximálně 255 znaků.' })
  contactEmail?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Ulice musí být text.' })
  @MinLength(1, { message: 'Ulice je povinná.' })
  @MaxLength(150, { message: 'Ulice může mít maximálně 150 znaků.' })
  street!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Město musí být text.' })
  @MinLength(1, { message: 'Město je povinné.' })
  @MaxLength(100, { message: 'Město může mít maximálně 100 znaků.' })
  city!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'PSČ musí být text.' })
  @Matches(/^\d{3}\d{2}$/, { message: 'PSČ musí mít formát 12345.' })
  postalCode!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
  )
  @IsString({ message: 'Kód země musí být text.' })
  @Matches(/^[A-Z]{2}$/, {
    message: 'Kód země musí být ve formátu ISO-2 (např. CZ).',
  })
  countryCode!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsOptional()
  @IsString({ message: 'Prefix účtu musí být text.' })
  @Matches(/^\d{1,6}$/, {
    message: 'Prefix účtu může obsahovat 1 až 6 číslic.',
  })
  bankAccountPrefix?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'Číslo účtu musí být text.' })
  @Matches(/^\d{2,10}$/, {
    message: 'Číslo účtu musí obsahovat 2 až 10 číslic.',
  })
  bankAccountNumber!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString({ message: 'Kód banky musí být text.' })
  @Matches(/^\d{4}$/, { message: 'Kód banky musí obsahovat přesně 4 číslice.' })
  bankCode!: string;

  @IsEnum(DefaultVariableSymbolType, {
    message: 'Strategie variabilního symbolu musí být ico nebo custom.',
  })
  defaultVariableSymbolType!: DefaultVariableSymbolType;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsOptional()
  @IsString({ message: 'Výchozí variabilní symbol musí být text.' })
  @Matches(/^\d{1,10}$/, {
    message: 'Výchozí variabilní symbol musí mít 1 až 10 číslic.',
  })
  defaultVariableSymbolValue?: string;

  @IsInt({ message: 'Splatnost musí být celé číslo.' })
  @Min(1, { message: 'Splatnost musí být alespoň 1 den.' })
  @Max(90, { message: 'Splatnost může být maximálně 90 dní.' })
  defaultDueDays!: number;
}
