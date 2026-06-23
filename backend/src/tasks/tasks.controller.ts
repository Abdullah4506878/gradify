import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { ReviewTaskDto } from './dto/review-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
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
    return this.tasksService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.tasksService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  submitTask(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: SubmitTaskDto,
  ) {
    return this.tasksService.submitTask(id, req.user.id, dto);
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  reviewTask(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Body() dto: ReviewTaskDto,
  ) {
    return this.tasksService.reviewTask(id, req.user.id, dto);
  }
}
