import { Semester } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateAcademicSessionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(Semester)
  semester: Semester;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsInt()
  @IsPositive()
  programId: number;
}
