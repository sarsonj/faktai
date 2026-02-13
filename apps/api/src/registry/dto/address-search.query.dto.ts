import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class AddressSearchQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Vyhledávací dotaz musí být text.' })
  @MinLength(3, {
    message: 'Vyhledávací dotaz adresy musí mít alespoň 3 znaky.',
  })
  q!: string;
}
