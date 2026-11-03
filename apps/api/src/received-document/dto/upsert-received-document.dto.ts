import { ReceivedVatRegime } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { REVERSE_CHARGE_CODE_VALUES } from '../../tax/vat-regime';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === ''
    ? undefined
    : typeof value === 'string'
      ? value.trim()
      : value;

export class ReceivedDocumentLineDto {
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsIn([21, 12, 0], { message: 'Sazba DPH musí být 21, 12 nebo 0.' })
  vatRate!: number;

  /** Základ daně, např. "1250.50". */
  @IsString({ message: 'Základ daně musí být text.' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message:
      'Základ daně musí být nezáporné číslo s nejvýše 2 desetinnými místy.',
  })
  base!: string;

  /** DPH z dokladu; když chybí, dopočítá se. U přenesení a EU se vždy dopočítá. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'DPH musí být text.' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'DPH musí být nezáporné číslo s nejvýše 2 desetinnými místy.',
  })
  vat?: string;
}

export class UpsertReceivedDocumentDto {
  /** Evidenční číslo dokladu dodavatele. */
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Číslo dokladu je povinné.' })
  @MaxLength(60, { message: 'Číslo dokladu může mít maximálně 60 znaků.' })
  documentNumber!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Název dodavatele je povinný.' })
  @MaxLength(150)
  supplierName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== ''
      ? value.replace(/\s+/g, '')
      : undefined,
  )
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'IČO dodavatele musí mít 8 číslic.' })
  supplierIco?: string;

  /** DIČ (CZ…) nebo VAT ID z EU včetně kódu státu. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== ''
      ? value.replace(/[\s.-]+/g, '').toUpperCase()
      : undefined,
  )
  @IsOptional()
  @Matches(/^[A-Z]{2}[0-9A-Z+*]{2,12}$|^\d{8,10}$/, {
    message: 'DIČ / VAT ID dodavatele má neplatný formát.',
  })
  supplierVatId?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  supplierStreet?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierCity?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  supplierPostalCode?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Země dodavatele musí být dvoupísmenný kód.',
  })
  supplierCountryCode?: string;

  /** Předmět plnění (krátký popis). */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Datum vystavení musí být platné datum.' })
  issueDate?: string;

  /** DUZP / datum povinnosti přiznat daň (YYYY-MM-DD). */
  @IsDateString({}, { message: 'DUZP musí být platné datum.' })
  taxableSupplyDate!: string;

  /** Datum uplatnění odpočtu; výchozí = DUZP. */
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Datum uplatnění odpočtu musí být platné datum.' },
  )
  deductionDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Datum splatnosti musí být platné datum.' })
  dueDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Datum úhrady musí být platné datum.' })
  paidAt?: string;

  @IsEnum(ReceivedVatRegime, { message: 'Režim DPH není platný.' })
  vatRegime!: ReceivedVatRegime;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(REVERSE_CHARGE_CODE_VALUES, {
    message: 'Kód předmětu plnění není platný.',
  })
  reverseChargeCode?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Doklad musí obsahovat alespoň jeden řádek rozpisu DPH.',
  })
  @ValidateNested({ each: true })
  @Type(() => ReceivedDocumentLineDto)
  lines!: ReceivedDocumentLineDto[];
}

export class ListReceivedDocumentsQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  year?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsIn([10, 20, 50])
  pageSize?: number;
}
