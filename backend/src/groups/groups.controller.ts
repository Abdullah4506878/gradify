import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GroupStatus, Role } from '@prisma/client';
import { IsEnum as CVIsEnum } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { SupervisorPreferenceDto } from './dto/supervisor-preference.dto';
import { GroupsService } from './groups.service';

class UpdateGroupStatusDto {
  @CVIsEnum(GroupStatus)
  status: GroupStatus;
}

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  async create(@Req() req: AuthRequest, @Body() dto: CreateGroupDto) {
    const user = await this.usersService.findById(req.user.id);
    if (!user || !user.universityId) {
      throw new BadRequestException('User university not found');
    }
    return this.groupsService.create(req.user.id, dto, user.universityId);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.groupsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.findOne(id);
  }

  @Post(':id/join')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  join(
    @Param('id', ParseIntPipe) groupId: number,
    @Req() req: AuthRequest,
    @Body('userId') bodyUserId?: number,
  ) {
    const userId = bodyUserId ?? req.user.id;
    return this.groupsService.joinGroup(groupId, userId);
  }

  @Post(':id/preferences')
  submitPreferences(
    @Param('id', ParseIntPipe) groupId: number,
    @Req() req: AuthRequest,
    @Body() dto: SupervisorPreferenceDto,
  ) {
    return this.groupsService.submitPreferences(groupId, req.user.id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupStatusDto,
  ) {
    return this.groupsService.updateStatus(id, dto.status);
  }
}
