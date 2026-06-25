import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FypRole, GroupStatus, Phase, ProposalStatus, Role, Semester } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { SupervisorPreferenceDto } from './dto/supervisor-preference.dto';

const SEMESTER_CODE: Record<Semester, string> = {
  FALL: 'F',
  SPRING: 'S',
  SUMMER: 'SU',
};

const GROUP_INCLUDE = {
  leader: { select: { id: true, name: true, email: true, role: true } },
  members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  preferences: { include: { supervisor: { select: { id: true, name: true, email: true } } }, orderBy: { preference: 'asc' as const } },
  phase: { include: { session: { include: { program: true } } } },
} as const;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(leaderId: number, dto: CreateGroupDto, universityId: number) {
    const phase = await this.prisma.fYPPhase.findUnique({ where: { id: dto.phaseId } });
    if (!phase || phase.phase !== Phase.FYP_1) {
      throw new BadRequestException('Students can only create groups for FYP-1');
    }

    const existing = await this.prisma.enrollment.findFirst({
      where: { userId: leaderId, group: { phaseId: dto.phaseId } },
    });
    if (existing) throw new ConflictException('You are already in a group for this phase');

    const group = await this.prisma.group.create({
      data: {
        phaseId: dto.phaseId,
        universityId,
        leaderId,
        members: { create: { userId: leaderId } },
      },
      include: GROUP_INCLUDE,
    });

    return group;
  }

  findAll(user: { id: number; role: Role }) {
    const where =
      user.role === Role.MANAGER
        ? {}
        : user.role === Role.SUPERVISOR
          ? { preferences: { some: { preference: 1, supervisorId: user.id } } }
          : { members: { some: { userId: user.id } } };

    return this.prisma.group.findMany({ where, include: GROUP_INCLUDE });
  }

  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id }, include: GROUP_INCLUDE });
    if (!group) throw new NotFoundException(`Group #${id} not found`);
    return group;
  }

  async joinGroup(groupId: number, userId: number) {
    const group = await this.findOne(groupId);

    if (group.status !== GroupStatus.FORMING) {
      throw new BadRequestException('Group is no longer accepting members');
    }

    if (group.members.length >= 3) {
      throw new BadRequestException('Group has reached the maximum of 3 members');
    }

    const alreadyMember = await this.prisma.enrollment.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (alreadyMember) throw new ConflictException('You are already a member of this group');

    return this.prisma.enrollment.create({
      data: { userId, groupId },
      include: { user: { select: { id: true, name: true, email: true } }, group: true },
    });
  }

  async submitPreferences(groupId: number, userId: number, dto: SupervisorPreferenceDto) {
    const group = await this.findOne(groupId);

    if (group.leaderId !== userId) {
      throw new ForbiddenException('Only the group leader can submit supervisor preferences');
    }

    if (group.preferences.length > 0) {
      throw new ConflictException('Supervisor preferences have already been submitted and cannot be changed');
    }

    const memberCount = await this.prisma.enrollment.count({ where: { groupId } });
    if (memberCount < 2) {
      throw new BadRequestException('Group must have at least 2 members before submitting preferences');
    }

    const preferenceNums = dto.preferences.map((p) => p.preference);
    const hasDuplicateRank = new Set(preferenceNums).size !== preferenceNums.length;
    if (hasDuplicateRank) throw new BadRequestException('Each preference rank (1, 2, 3) must be unique');

    await this.prisma.supervisorPreference.createMany({
      data: dto.preferences.map((p) => ({
        groupId,
        supervisorId: p.supervisorId,
        preference: p.preference,
      })),
    });

    // Generate FYP ID if not yet assigned
    if (!group.fypId) {
      const fypId = await this.generateFypId(group.phaseId);
      await this.prisma.group.update({ where: { id: groupId }, data: { fypId } });
    }

    // Notify all managers in this university
    const managers = await this.prisma.user.findMany({
      where: { role: Role.MANAGER, universityId: group.universityId },
      select: { id: true },
    });
    const managerIds = managers.map((m) => m.id);
    if (managerIds.length > 0) {
      this.notificationService.createMany(
        managerIds,
        'Supervisor Preferences Submitted',
        `Group ${group.fypId} has submitted their supervisor preferences`,
        'PREFERENCE',
        '/dashboard/manager/groups/assign',
      ).catch(() => {});
    }

    return this.findOne(groupId);
  }

  async assignSupervisor(groupId: number, supervisorId: number) {
    const group = await this.findOne(groupId);

    // Replace all existing preferences with the manager's assignment
    await this.prisma.supervisorPreference.deleteMany({ where: { groupId } });
    await this.prisma.supervisorPreference.create({
      data: { groupId, supervisorId, preference: 1 },
    });

    const supervisor = await this.prisma.user.findUnique({
      where: { id: supervisorId },
      select: { name: true, email: true },
    });
    const supervisorName = supervisor?.name ?? supervisor?.email ?? 'Your supervisor';

    // Notify assigned supervisor
    console.log('Sending assignment notification to supervisor userId:', supervisorId);
    this.notificationService.createNotification(
      supervisorId,
      'Group Assigned',
      `You have been assigned as supervisor for group ${group.fypId}`,
      'ASSIGNMENT',
      '/dashboard/supervisor/groups',
    ).catch(() => {});

    // Notify all group members
    const enrollments = await this.prisma.enrollment.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = [...new Set([...enrollments.map((e) => e.userId), group.leaderId])];
    memberIds.forEach((uid) => console.log('Sending assignment notification to member userId:', uid));
    this.notificationService.createMany(
      memberIds,
      'Supervisor Assigned',
      `${supervisorName} has been assigned as your supervisor`,
      'ASSIGNMENT',
      '/dashboard/student/group',
    ).catch(() => {});

    return this.findOne(groupId);
  }

  async setMyRole(userId: number, role: FypRole) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId },
    });
    if (!enrollment) throw new NotFoundException('No group enrollment found');

    if (enrollment.fypRole !== null) {
      throw new ForbiddenException('Role already selected and cannot be changed');
    }

    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { fypRole: role },
    });
  }

  async getFypProjects() {
    return this.prisma.group.findMany({
      where: {
        preferences: { some: { preference: 1 } },
        proposal: { status: ProposalStatus.APPROVED },
      },
      include: {
        proposal: {
          select: {
            id: true,
            projectTitle: true,
            problemStatement: true,
            proposedSolution: true,
          },
        },
        preferences: {
          where: { preference: 1 },
          include: { supervisor: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async updateStatus(groupId: number, status: GroupStatus) {
    await this.findOne(groupId);
    return this.prisma.group.update({
      where: { id: groupId },
      data: { status },
      include: GROUP_INCLUDE,
    });
  }

  private async generateFypId(phaseId: number): Promise<string> {
    const phase = await this.prisma.fYPPhase.findUnique({
      where: { id: phaseId },
      include: { session: { include: { program: true } } },
    });
    if (!phase) throw new NotFoundException('FYP phase not found');

    const programCode = phase.session.program.code.toUpperCase();
    const semCode = SEMESTER_CODE[phase.session.semester];
    const year = String(phase.session.year).slice(-2);

    const count = await this.prisma.group.count({ where: { phaseId, fypId: { not: null } } });
    const sequence = String(count + 1).padStart(3, '0');

    return `${programCode}-FYP-${semCode}${year}-${sequence}`;
  }
}
