import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateUniversityDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
