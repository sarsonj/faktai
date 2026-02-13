import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token musí být text.' })
  token!: string;

  @IsString({ message: 'Heslo musí být text.' })
  @MinLength(8, { message: 'Heslo musí mít alespoň 8 znaků.' })
  @MaxLength(256, { message: 'Heslo může mít maximálně 256 znaků.' })
  password!: string;

  @IsString({ message: 'Potvrzení hesla musí být text.' })
  passwordConfirm!: string;
}
