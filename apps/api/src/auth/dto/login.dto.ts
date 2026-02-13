import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'E-mail musí být ve správném formátu.' })
  email!: string;

  @IsString({ message: 'Heslo musí být text.' })
  password!: string;
}
