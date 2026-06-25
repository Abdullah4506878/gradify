import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateProposalDto {
  @IsInt()
  @IsPositive()
  groupId: number;

  @IsString()
  @IsNotEmpty()
  projectTitle: string;

  @IsString()
  @IsNotEmpty()
  problemStatement: string;

  @IsString()
  @IsNotEmpty()
  proposedSolution: string;
}
