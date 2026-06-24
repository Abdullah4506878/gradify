import { IsInt, IsPositive } from 'class-validator';

export class CreateGroupDto {
  @IsInt()
  @IsPositive()
  phaseId: number;
}
