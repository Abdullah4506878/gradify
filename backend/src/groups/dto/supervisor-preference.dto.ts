import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsPositive, Max, Min, ValidateNested } from 'class-validator';

export class PreferenceItemDto {
  @IsInt()
  @IsPositive()
  supervisorId: number;

  @IsInt()
  @Min(1)
  @Max(3)
  preference: number;
}

export class SupervisorPreferenceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto[];
}
