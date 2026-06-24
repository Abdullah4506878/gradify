import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProposalStatus } from '@prisma/client';

export class ReviewProposalDto {
  @IsEnum(ProposalStatus)
  status: ProposalStatus;

  @IsOptional()
  @IsString()
  supervisorComments?: string;
}

export class ManagerReviewProposalDto {
  @IsOptional()
  @IsString()
  managerComments?: string;
}
