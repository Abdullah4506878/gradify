import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReviewTaskDto } from './dto/review-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';

const TASK_INCLUDE = {
  group: { select: { id: true, fypId: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  supervisor: { select: { id: true, name: true, email: true } },
  submissions: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' as const } },
  reviews: { include: { reviewer: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' as const } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(supervisorId: number, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
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

    this.notificationService.createNotification(
      dto.assignedToId,
      'New Task Assigned',
      `New task "${task.title}" has been assigned to you`,
      'TASK',
      '/dashboard/student/tasks',
    ).catch(() => {});

    return task;
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

    const submittableStatuses: TaskStatus[] = [TaskStatus.PENDING, TaskStatus.MINOR_ISSUES, TaskStatus.REJECTED];
    if (!submittableStatuses.includes(task.status)) {
      throw new BadRequestException('Task cannot be submitted in its current state');
    }

    if (!file) {
      throw new BadRequestException('A file attachment is required for submission');
    }

    const fileUrl = `/uploads/${file.filename}`;

    await this.prisma.taskSubmission.create({
      data: {
        taskId: id,
        userId,
        description: dto.description,
        fileUrl,
        githubLink: dto.githubLink,
      },
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.SUBMITTED },
      include: TASK_INCLUDE,
    });

    this.notificationService.createNotification(
      task.supervisorId,
      'Task Submitted',
      `Student has submitted task "${task.title}" for review`,
      'TASK_SUBMISSION',
      '/dashboard/supervisor/tasks',
    ).catch(() => {});

    return updated;
  }

  async reviewTask(id: number, reviewerId: number, dto: ReviewTaskDto) {
    const task = await this.findOne(id);

    if (task.supervisorId !== reviewerId) {
      throw new ForbiddenException('Only the supervisor who assigned this task can review it');
    }
    if (task.status !== TaskStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted tasks can be reviewed');
    }

    await this.prisma.taskReview.create({
      data: { taskId: id, reviewerId, status: dto.status, reason: dto.reason },
    });

    const newStatus = dto.status === TaskStatus.REJECTED ? TaskStatus.PENDING : dto.status;

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: newStatus },
      include: TASK_INCLUDE,
    });

    let notifTitle: string;
    let notifMessage: string;
    if (dto.status === TaskStatus.APPROVED) {
      notifTitle = 'Task Approved ✓';
      notifMessage = `Your task "${task.title}" has been approved`;
    } else if (dto.status === TaskStatus.MINOR_ISSUES) {
      notifTitle = 'Task Has Minor Issues';
      notifMessage = `Your task "${task.title}" has minor issues that need to be addressed`;
    } else {
      notifTitle = 'Task Rejected';
      notifMessage = `Your task "${task.title}" has been rejected. Please review the feedback and resubmit`;
    }

    this.notificationService.createNotification(
      task.assignedToId,
      notifTitle,
      notifMessage,
      'TASK_REVIEW',
      '/dashboard/student/tasks',
    ).catch(() => {});

    return updated;
  }
}
