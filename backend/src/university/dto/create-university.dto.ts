import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUniversityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;
}
