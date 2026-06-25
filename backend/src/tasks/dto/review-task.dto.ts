import { TaskStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const REVIEW_STATUSES = [
  TaskStatus.APPROVED,
  TaskStatus.MINOR_ISSUES,
  TaskStatus.REJECTED,
] as const;

export class ReviewTaskDto {
  @IsIn(REVIEW_STATUSES)
  status: (typeof REVIEW_STATUSES)[number];

  @IsString()
  @IsNotEmpty()
  reason: string;
}
