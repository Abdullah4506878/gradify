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
import { ApproveMembersDto } from './dto/approve-members.dto';

const TASK_INCLUDE = {
  group: {
    select: {
      id: true,
      fypId: true,
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      proposal: { select: { projectTitle: true } },
    },
  },
  supervisor: { select: { id: true, name: true, email: true } },
  memberStatuses: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private getNextFridayDeadline(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    let daysUntilFriday: number;

    if (dayOfWeek < 5) {
      // Before Friday: go to this week's Friday
      daysUntilFriday = 5 - dayOfWeek;
    } else if (dayOfWeek === 5) {
      // Today is Friday: skip to next Friday
      daysUntilFriday = 7;
    } else {
      // Saturday (6): go to next Friday
      daysUntilFriday = 6;
    }

    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    nextFriday.setHours(23, 59, 59, 0);
    return nextFriday;
  }

  private async getSetting(key: string, fallback: string): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    const parsed = parseInt(setting?.value ?? fallback, 10);
    return isNaN(parsed) ? parseInt(fallback, 10) : parsed;
  }

  private async assertSupervisorOwnsGroup(supervisorId: number, groupId: number) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        preferences: { some: { preference: 1, supervisorId } },
      },
    });
    if (!group) {
      throw new ForbiddenException('You are not the assigned supervisor for this group');
    }
    return group;
  }

  async createTask(supervisorId: number, dto: CreateTaskDto) {
    await this.assertSupervisorOwnsGroup(supervisorId, dto.groupId);

    const maxPerGroup = await this.getSetting('task_max_per_group', '16');
    const existingCount = await this.prisma.task.count({ where: { groupId: dto.groupId } });
    if (existingCount >= maxPerGroup) {
      throw new BadRequestException(`Maximum of ${maxPerGroup} tasks per group has been reached`);
    }

    const deadline = this.getNextFridayDeadline();

    const task = await this.prisma.task.create({
      data: {
        supervisorId,
        groupId: dto.groupId,
        title: dto.title,
        description: dto.description,
        deadline,
      },
      include: TASK_INCLUDE,
    });

    const [members, supervisor] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { groupId: dto.groupId },
        select: { userId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: supervisorId },
        select: { universityId: true },
      }),
    ]);

    const memberIds = members.map((m) => m.userId);
    if (memberIds.length > 0) {
      this.notificationService
        .createMany(
          memberIds,
          'New Group Task',
          `New task "${task.title}" has been assigned to your group`,
          'TASK',
          '/dashboard/student/tasks',
        )
        .catch(() => {});
    }

    if (supervisor?.universityId) {
      const managers = await this.prisma.user.findMany({
        where: { role: Role.MANAGER, universityId: supervisor.universityId },
        select: { id: true },
      });
      const managerIds = managers.map((m) => m.id);
      if (managerIds.length > 0) {
        this.notificationService
          .createMany(
            managerIds,
            'New Group Task',
            `Supervisor assigned task "${task.title}" to group ${task.group.fypId ?? `#${task.groupId}`}`,
            'TASK',
            '/dashboard/manager/tasks',
          )
          .catch(() => {});
      }
    }

    return task;
  }

  async approveMembers(supervisorId: number, taskId: number, dto: ApproveMembersDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        group: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException(`Task #${taskId} not found`);
    if (task.supervisorId !== supervisorId) {
      throw new ForbiddenException('Only the supervisor who assigned this task can approve members');
    }

    const memberUserIds = new Set(task.group.members.map((m) => m.userId));
    for (const item of dto.memberStatuses) {
      if (!memberUserIds.has(item.userId)) {
        throw new BadRequestException(`User #${item.userId} is not a member of this group`);
      }
    }

    for (const item of dto.memberStatuses) {
      await this.prisma.taskMemberStatus.upsert({
        where: { taskId_userId: { taskId, userId: item.userId } },
        create: { taskId, userId: item.userId, isDone: item.isDone },
        update: { isDone: item.isDone },
      });
    }
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.APPROVED },
    });

    const updated = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: TASK_INCLUDE,
    });

    const notifiedIds = dto.memberStatuses.map((m) => m.userId);
    if (notifiedIds.length > 0) {
      this.notificationService
        .createMany(
          notifiedIds,
          'Task Reviewed',
          `Your supervisor has marked your status on task "${task.title}"`,
          'TASK_REVIEW',
          '/dashboard/student/tasks',
        )
        .catch(() => {});
    }

    return updated;
  }

  async getGroupScores(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        fypId: true,
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!group) throw new NotFoundException(`Group #${groupId} not found`);

    const [totalTasks, groupTasks, taskTotalMarks] = await Promise.all([
      this.prisma.task.count({ where: { groupId } }),
      this.prisma.task.findMany({ where: { groupId }, select: { id: true } }),
      this.getSetting('task_total_marks', '15'),
    ]);

    const taskIds = groupTasks.map((t) => t.id);
    const doneStatuses = taskIds.length
      ? await this.prisma.taskMemberStatus.findMany({
          where: { taskId: { in: taskIds }, isDone: true },
          select: { userId: true },
        })
      : [];

    const doneCountByUser = new Map<number, number>();
    for (const s of doneStatuses) {
      doneCountByUser.set(s.userId, (doneCountByUser.get(s.userId) ?? 0) + 1);
    }

    const members = group.members.map((enrollment) => {
      const doneTasks = doneCountByUser.get(enrollment.userId) ?? 0;
      const score =
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * taskTotalMarks * 100) / 100 : 0;
      return {
        userId: enrollment.userId,
        name: enrollment.user.name,
        email: enrollment.user.email,
        doneTasks,
        totalTasks,
        score,
      };
    });

    return {
      groupId: group.id,
      fypId: group.fypId,
      totalTasks,
      taskTotalMarks,
      members,
    };
  }

  getTasksForSupervisor(supervisorId: number) {
    return this.prisma.task.findMany({
      where: { supervisorId },
      include: TASK_INCLUDE,
      orderBy: { deadline: 'asc' },
    });
  }

  async getTasksForStudent(userId: number) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId },
      select: { groupId: true },
    });
    if (!enrollment) return [];

    return this.prisma.task.findMany({
      where: { groupId: enrollment.groupId },
      include: TASK_INCLUDE,
      orderBy: { deadline: 'asc' },
    });
  }

  getTasksForManager() {
    return this.prisma.task.findMany({
      include: TASK_INCLUDE,
      orderBy: { deadline: 'asc' },
    });
  }

  async getSupervisorSchedule(supervisorId: number) {
    const today = new Date();

    const [moms, taskDeadlines, supervisorGroups, allTasks] = await Promise.all([
      this.prisma.meetingMinutes.findMany({
        where: { supervisorId, nextMeetingDate: { not: null } },
        include: { group: { select: { id: true, fypId: true } } },
      }),
      this.prisma.task.findMany({
        where: {
          supervisorId,
          status: TaskStatus.PENDING,
        },
        include: {
          group: { select: { id: true, fypId: true } },
        },
        orderBy: { deadline: 'asc' },
      }),
      this.prisma.group.findMany({
        where: { preferences: { some: { preference: 1, supervisorId } } },
        select: { id: true, fypId: true },
      }),
      this.prisma.task.findMany({
        where: { supervisorId },
        select: { groupId: true, status: true },
      }),
    ]);

    const futureMoms = moms
      .filter((m) => m.nextMeetingDate && new Date(m.nextMeetingDate) > today)
      .sort((a, b) => new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime());

    const nextMeetingByGroup: Record<number, string | null> = {};
    for (const m of futureMoms) {
      const gid = m.group.id;
      if (!(gid in nextMeetingByGroup)) nextMeetingByGroup[gid] = m.nextMeetingDate;
    }

    const upcomingMeetings = futureMoms.map((m) => ({
      id: m.id,
      fypId: m.group.fypId,
      nextMeetingDate: m.nextMeetingDate,
      nextMeetingTime: m.nextMeetingTime,
      nextMeetingVenue: m.nextMeetingVenue,
    }));

    const groupSummary = supervisorGroups.map((g) => {
      const groupTasks = allTasks.filter((t) => t.groupId === g.id);
      return {
        id: g.id,
        fypId: g.fypId,
        totalTasks: groupTasks.length,
        pendingTasks: groupTasks.filter((t) => t.status === TaskStatus.PENDING).length,
        completedTasks: groupTasks.filter((t) => t.status === TaskStatus.APPROVED).length,
        nextMeetingDate: nextMeetingByGroup[g.id] ?? null,
      };
    });

    return { upcomingMeetings, taskDeadlines, groupSummary };
  }
}
