import { IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitTaskDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  githubLink?: string;
}
