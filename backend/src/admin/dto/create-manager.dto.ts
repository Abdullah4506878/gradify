import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateManagerDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsInt()
  universityId?: number;
}
