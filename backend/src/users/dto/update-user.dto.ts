import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsInt()
  @IsPositive()
  @IsOptional()
  universityId?: number;
}

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  githubUrl?: string | null;

  @IsString()
  @IsOptional()
  linkedinUrl?: string | null;
}
