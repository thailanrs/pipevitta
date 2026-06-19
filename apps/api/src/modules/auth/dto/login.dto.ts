import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  tenantSlug: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  passwordHash: string;
}
