import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateMomDto {
  @IsDateString()
  @IsOptional()
  meetingDate?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  discussion?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  decisions?: string;

  @IsString()
  @IsOptional()
  nextSteps?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  attendees?: string;
}
