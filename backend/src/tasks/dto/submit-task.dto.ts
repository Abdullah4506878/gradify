import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class SubmitTaskDto {
  @IsString()
  @MinLength(100)
  description: string;

  @IsUrl()
  @IsOptional()
  fileUrl?: string;

  @IsUrl()
  @IsOptional()
  githubUrl?: string;
}
