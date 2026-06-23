import { Semester } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateAcademicSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
