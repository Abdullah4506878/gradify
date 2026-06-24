import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMomDto {
  @IsNotEmpty()
  groupId: number;

  @IsNotEmpty()
  @IsString()
  agenda: string;

  @IsNotEmpty()
  @IsString()
  discussion: string;

  @IsNotEmpty()
  @IsString()
  decisions: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsNotEmpty()
  @IsString()
  attendees: string;
}
