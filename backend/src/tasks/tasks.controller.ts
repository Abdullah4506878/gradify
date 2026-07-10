import {
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
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { ApproveMembersDto } from './dto/approve-members.dto';
import { TasksService } from './tasks.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  create(@Req() req: AuthRequest, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(req.user.id, dto);
  }

  @Patch(':id/approve-members')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  approveMembers(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: ApproveMembersDto,
  ) {
    return this.tasksService.approveMembers(req.user.id, id, dto);
  }

  @Get('supervisor/my-tasks')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  getSupervisorTasks(@Req() req: AuthRequest) {
    return this.tasksService.getTasksForSupervisor(req.user.id);
  }

  @Get('student/my-tasks')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  getStudentTasks(@Req() req: AuthRequest) {
    return this.tasksService.getTasksForStudent(req.user.id);
  }

  @Get('manager/all')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER)
  getManagerTasks() {
    return this.tasksService.getTasksForManager();
  }

  @Get('group/:groupId/scores')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.SUPERVISOR)
  getGroupScores(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.tasksService.getGroupScores(groupId);
  }

  @Get('supervisor/schedule')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  getSupervisorSchedule(@Req() req: AuthRequest) {
    return this.tasksService.getSupervisorSchedule(req.user.id);
  }
}
