import { TaskStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const REVIEW_STATUSES = [
  TaskStatus.APPROVED,
  TaskStatus.REJECTED,
  TaskStatus.ACCEPTED_MINOR_ISSUES,
] as const;

export class ReviewTaskDto {
  @IsIn(REVIEW_STATUSES)
  status: (typeof REVIEW_STATUSES)[number];

  @IsString()
  @IsNotEmpty()
  reason: string;
}
