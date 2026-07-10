import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class LoginDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}