import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FypRole, GroupStatus, Role } from '@prisma/client';
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

  @Get('fyp-projects')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  getFypProjects() {
    return this.groupsService.getFypProjects();
  }

  @Patch('my-role')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  setMyRole(@Req() req: AuthRequest, @Body('role') role: FypRole) {
    return this.groupsService.setMyRole(req.user.id, role);
  }

  // ── Invite endpoints (must be before :id routes) ─────────────────────────

  @Get('invites/pending')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  getPendingInvites(@Req() req: AuthRequest) {
    return this.groupsService.getPendingInvites(req.user.id);
  }

  @Post('invites/:inviteId/accept')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  acceptInvite(
    @Param('inviteId', ParseIntPipe) inviteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.groupsService.acceptInvite(inviteId, req.user.id);
  }

  @Post('invites/:inviteId/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  rejectInvite(
    @Param('inviteId', ParseIntPipe) inviteId: number,
    @Req() req: AuthRequest,
  ) {
    return this.groupsService.rejectInvite(inviteId, req.user.id);
  }

  // ── :id routes ────────────────────────────────────────────────────────────

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
    @Body('userId') invitedId: number,
  ) {
    if (!invitedId) throw new BadRequestException('userId is required');
    return this.groupsService.inviteMember(groupId, req.user.id, invitedId);
  }

  @Post(':id/preferences')
  submitPreferences(
    @Param('id', ParseIntPipe) groupId: number,
    @Req() req: AuthRequest,
    @Body() dto: SupervisorPreferenceDto,
  ) {
    return this.groupsService.submitPreferences(groupId, req.user.id, dto);
  }

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  assignSupervisor(
    @Param('id', ParseIntPipe) groupId: number,
    @Body('supervisorId', ParseIntPipe) supervisorId: number,
  ) {
    return this.groupsService.assignSupervisor(groupId, supervisorId);
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

  @Patch(':id/manager-edit')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  managerEditGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      addMemberEmail?: string;
      removeMemberId?: number;
      newLeaderId?: number;
      newSupervisorId?: number;
    },
  ) {
    return this.groupsService.managerEditGroup(id, data);
  }

  @Delete(':id/manager-delete')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  managerDeleteGroup(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.managerDeleteGroup(id);
  }
}
