import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MOMStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateMomDto } from './dto/create-mom.dto';
import { UpdateMomDto } from './dto/update-mom.dto';

const MOM_INCLUDE = {
  group: { select: { id: true, fypId: true } },
  supervisor: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class MomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  create(supervisorId: number, dto: CreateMomDto) {
    return this.prisma.meetingMinutes.create({
      data: {
        supervisorId,
        groupId: dto.groupId,
        meetingDate: new Date(),
        agenda: dto.agenda,
        discussion: dto.discussion,
        decisions: dto.decisions,
        nextSteps: dto.nextSteps,
        attendees: dto.attendees ?? '',
        actionItems: dto.actionItems,
        nextMeetingDate: dto.nextMeetingDate,
        nextMeetingTime: dto.nextMeetingTime,
        nextMeetingVenue: dto.nextMeetingVenue,
      },
      include: MOM_INCLUDE,
    });
  }

  findAll(user: { id: number; role: Role }) {
    const where =
      user.role === Role.MANAGER
        ? {}
        : user.role === Role.SUPERVISOR
          ? { supervisorId: user.id }
          : { group: { members: { some: { userId: user.id } } } };

    return this.prisma.meetingMinutes.findMany({
      where,
      include: MOM_INCLUDE,
      orderBy: { meetingDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const mom = await this.prisma.meetingMinutes.findUnique({
      where: { id },
      include: MOM_INCLUDE,
    });
    if (!mom) throw new NotFoundException(`MOM #${id} not found`);
    return mom;
  }

  async update(id: number, supervisorId: number, dto: UpdateMomDto) {
    const mom = await this.findOne(id);

    if (mom.supervisorId !== supervisorId) {
      throw new ForbiddenException('You are not the supervisor who created this MOM');
    }
    if (mom.status === MOMStatus.SUBMITTED) {
      throw new ForbiddenException('Submitted MOMs cannot be edited');
    }

    return this.prisma.meetingMinutes.update({
      where: { id },
      data: {
        ...(dto.meetingDate && { meetingDate: new Date(dto.meetingDate) }),
        ...(dto.agenda !== undefined && { agenda: dto.agenda }),
        ...(dto.discussion !== undefined && { discussion: dto.discussion }),
        ...(dto.decisions !== undefined && { decisions: dto.decisions }),
        ...(dto.nextSteps !== undefined && { nextSteps: dto.nextSteps }),
        ...(dto.attendees !== undefined && { attendees: dto.attendees }),
      },
      include: MOM_INCLUDE,
    });
  }

  async submit(id: number, supervisorId: number) {
    const mom = await this.findOne(id);

    if (mom.supervisorId !== supervisorId) {
      throw new ForbiddenException('You are not the supervisor who created this MOM');
    }
    if (mom.status === MOMStatus.SUBMITTED) {
      throw new ForbiddenException('This MOM has already been submitted');
    }

    const updated = await this.prisma.meetingMinutes.update({
      where: { id },
      data: {
        status: MOMStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: MOM_INCLUDE,
    });

    // Notify managers in the same university as the supervisor
    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId },
      select: { universityId: true },
    });
    if (supervisor?.universityId) {
      const managers = await this.prisma.user.findMany({
        where: { role: Role.MANAGER, universityId: supervisor.universityId },
        select: { id: true },
      });
      const managerIds = managers.map((m) => m.id);
      managerIds.forEach((uid) => console.log('Sending MOM notification to manager userId:', uid));
      if (managerIds.length > 0) {
        this.notificationService.createMany(
          managerIds,
          'MOM Submitted',
          `Supervisor has submitted minutes of meeting for group ${mom.group?.fypId ?? `#${mom.groupId}`}`,
          'MOM',
          '/dashboard/manager/proposals',
        ).catch(() => {});
      }
    }

    return updated;
  }
}
