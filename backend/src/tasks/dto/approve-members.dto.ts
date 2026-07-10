import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsPositive, ValidateNested } from 'class-validator';

export class MemberStatusItemDto {
  @IsInt()
  @IsPositive()
  userId: number;

  @IsBoolean()
  isDone: boolean;
}

export class ApproveMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemberStatusItemDto)
  memberStatuses: MemberStatusItemDto[];
}
