import { IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateProposalDto {
  @IsInt()
  @IsPositive()
  groupId: number;

  @IsString()
  @MinLength(3)
  projectTitle: string;

  @IsString()
  @MinLength(10)
  problemStatement: string;

  @IsString()
  @MinLength(10)
  proposedSolution: string;
}
