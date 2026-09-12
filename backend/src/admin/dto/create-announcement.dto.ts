import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
