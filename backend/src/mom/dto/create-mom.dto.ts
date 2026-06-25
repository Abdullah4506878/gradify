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

  @IsOptional()
  @IsString()
  attendees?: string;

  @IsOptional()
  @IsString()
  actionItems?: string;

  @IsOptional()
  @IsString()
  nextMeetingDate?: string;

  @IsOptional()
  @IsString()
  nextMeetingTime?: string;

  @IsOptional()
  @IsString()
  nextMeetingVenue?: string;

  @IsOptional()
  @IsString()
  participants?: string;
}
