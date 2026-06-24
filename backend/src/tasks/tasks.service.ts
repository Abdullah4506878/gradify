import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReviewTaskDto } from './dto/review-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';

const TASK_INCLUDE = {
  group: { select: { id: true, fypId: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  supervisor: { select: { id: true, name: true, email: true } },
  submission: true,
  review: {
    include: { reviewer: { select: { id: true, name: true, email: true } } },
  },
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(supervisorId: number, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        supervisorId,
        groupId: dto.groupId,
        assignedToId: dto.assignedToId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        deadline: new Date(dto.deadline),
      },
      include: TASK_INCLUDE,
    });
  }

  findAll(user: { id: number; role: Role }) {
    const where =
      user.role === Role.MANAGER
        ? {}
        : user.role === Role.SUPERVISOR
          ? { supervisorId: user.id }
          : { assignedToId: user.id };

    return this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: { deadline: 'asc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE });
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async submitTask(id: number, userId: number, dto: SubmitTaskDto, file?: Express.Multer.File) {
    const task = await this.findOne(id);

    if (task.assignedToId !== userId) {
      throw new ForbiddenException('This task is not assigned to you');
    }
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Only pending tasks can be submitted');
    }

    const fileUrl = file ? `/uploads/${file.filename}` : dto.fileUrl;

    await this.prisma.taskSubmission.create({
      data: { taskId: id, description: dto.description, fileUrl, githubUrl: dto.githubUrl },
    });

    return this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.SUBMITTED },
      include: TASK_INCLUDE,
    });
  }

  async reviewTask(id: number, supervisorId: number, dto: ReviewTaskDto) {
    const task = await this.findOne(id);

    if (task.supervisorId !== supervisorId) {
      throw new ForbiddenException('Only the supervisor who assigned this task can review it');
    }
    if (task.status !== TaskStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted tasks can be reviewed');
    }
    if (task.review) {
      throw new ConflictException('This task has already been reviewed');
    }

    await this.prisma.taskReview.create({
      data: { taskId: id, reviewedBy: supervisorId, status: dto.status, reason: dto.reason },
    });

    return this.prisma.task.update({
      where: { id },
      data: { status: dto.status },
      include: TASK_INCLUDE,
    });
  }
}
