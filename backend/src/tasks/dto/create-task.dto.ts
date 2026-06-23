import { TaskType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsInt()
  @IsPositive()
  groupId: number;

  @IsInt()
  @IsPositive()
  assignedToId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsDateString()
  deadline: string;
}
