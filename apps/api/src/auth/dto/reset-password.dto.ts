import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(10)
  @Matches(/[a-z]/, { message: 'Password must contain lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain special character' })
  password!: string;

  @IsString()
  passwordConfirm!: string;
}
