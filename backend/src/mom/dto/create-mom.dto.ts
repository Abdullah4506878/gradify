import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateMomDto {
  @IsInt()
  @IsPositive()
  groupId: number;

  @IsDateString()
  meetingDate: string;

  @IsString()
  @IsNotEmpty()
  agenda: string;

  @IsString()
  @IsNotEmpty()
  discussion: string;

  @IsString()
  @IsNotEmpty()
  decisions: string;

  @IsString()
  @IsOptional()
  nextSteps?: string;

  @IsString()
  @IsNotEmpty()
  attendees: string;
}
