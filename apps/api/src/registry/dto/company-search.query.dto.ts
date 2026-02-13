import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class CompanySearchQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Vyhledávací dotaz musí být text.' })
  @MinLength(2, { message: 'Vyhledávací dotaz musí mít alespoň 2 znaky.' })
  q!: string;
}
