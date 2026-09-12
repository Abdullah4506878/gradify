import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsInt()
  @IsPositive()
  groupId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
