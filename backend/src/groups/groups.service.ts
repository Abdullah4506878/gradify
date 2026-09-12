import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, FypRole, GroupStatus, InviteStatus, Phase, ProposalStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AdminService } from '../admin/admin.service';
import { AcademicSessionService } from '../academic-session/academic-session.service';
import { AuditActor, AuditService } from '../audit/audit.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { SupervisorPreferenceDto } from './dto/supervisor-preference.dto';

const GROUP_INCLUDE = {
  leader: { select: { id: true, name: true, email: true, role: true } },
  members: { include: { user: { select: { id: true, name: true, email: true, role: true, githubUrl: true } } } },
  preferences: { include: { supervisor: { select: { id: true, name: true, email: true } } }, orderBy: { preference: 'asc' as const } },
  phase: { include: { session: { include: { program: true } } } },
  invites: {
    include: {
      invited: { select: { id: true, name: true, email: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly adminService: AdminService,
    private readonly academicSessionService: AcademicSessionService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    leaderId: number,
    dto: CreateGroupDto,
    universityId: number,
    actor?: AuditActor | null,
    ipAddress?: string | null,
  ) {
    const session = await this.academicSessionService.getActiveSession();
    const fyp1Phase = session.phases.find((p) => p.phase === Phase.FYP_1);
    if (!fyp1Phase) {
      throw new BadRequestException('Active session has no FYP-1 phase configured.');
    }

    const group = await this.prisma.group.create({
      data: {
        phaseId: fyp1Phase.id,
        universityId,
        leaderId,
        members: { create: { userId: leaderId } },
      },
      include: GROUP_INCLUDE,
    });

    await this.auditService.log({
      userId: actor?.id ?? leaderId,
      userEmail: actor?.email,
      role: actor?.role,
      action: 'GROUP_CREATE',
      entity: 'GROUP',
      entityId: group.id,
      details: `Created group ${group.fypId ?? `#${group.id}`}`,
      ipAddress,
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

  async inviteMember(groupId: number, leaderId: number, invitedId: number) {
    const group = await this.findOne(groupId);

    if (group.leaderId !== leaderId) {
      throw new ForbiddenException('Only the group leader can invite members');
    }

    if (group.status !== GroupStatus.FORMING) {
      throw new BadRequestException('Group is no longer accepting members');
    }

    if (group.members.length >= 3) {
      throw new BadRequestException('Group has reached the maximum of 3 members');
    }

    const alreadyMember = group.members.some((m) => m.user.id === invitedId);
    if (alreadyMember) throw new ConflictException('This student is already a member of the group');

    const existingInvite = await this.prisma.groupInvite.findFirst({
      where: { groupId, invitedId, status: InviteStatus.PENDING },
    });
    if (existingInvite) throw new ConflictException('An invitation is already pending for this student');

    const activeEnrollment = await this.prisma.enrollment.findFirst({
      where: { userId: invitedId, status: EnrollmentStatus.ACTIVE },
    });
    if (activeEnrollment) throw new BadRequestException('This student is already part of another group');

    const invite = await this.prisma.groupInvite.create({
      data: { groupId, invitedId, invitedBy: leaderId, status: InviteStatus.PENDING },
    });

    this.notificationService.createNotification(
      invitedId,
      'Group Invitation',
      `You have been invited to join group ${group.fypId ?? `#${group.id}`}`,
      'INVITE',
      '/dashboard/student/group',
    ).catch(() => {});

    const managers = await this.prisma.user.findMany({
      where: { role: Role.MANAGER, universityId: group.universityId },
      select: { id: true },
    });
    if (managers.length > 0) {
      this.notificationService.createMany(
        managers.map((m) => m.id),
        'Group Invitation Sent',
        `An invitation was sent to join group ${group.fypId ?? `#${group.id}`}`,
        'INVITE',
        '/dashboard/manager/groups',
      ).catch(() => {});
    }

    return invite;
  }

  async acceptInvite(
    inviteId: number,
    userId: number,
    actor?: AuditActor | null,
    ipAddress?: string | null,
  ) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      include: {
        group: {
          select: {
            id: true,
            fypId: true,
            leaderId: true,
            status: true,
            universityId: true,
            members: { select: { id: true } },
          },
        },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.invitedId !== userId) throw new ForbiddenException('This invite is not for you');
    if (invite.status !== InviteStatus.PENDING) throw new BadRequestException('Invite is no longer pending');

    const { group } = invite;

    if (group.status !== GroupStatus.FORMING) {
      throw new BadRequestException('Group is no longer accepting members');
    }

    if (group.members.length >= 3) {
      throw new BadRequestException('Group has reached the maximum of 3 members');
    }

    const activeEnrollment = await this.prisma.enrollment.findFirst({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      include: { group: { select: { fypId: true, id: true } } },
    });
    if (activeEnrollment) {
      const fypId = activeEnrollment.group?.fypId ?? `#${activeEnrollment.groupId}`;
      throw new BadRequestException(`You are already part of a group. Your FYP ID: ${fypId}`);
    }

    await this.prisma.enrollment.create({ data: { userId, groupId: invite.groupId } });
    await this.prisma.groupInvite.update({ where: { id: inviteId }, data: { status: InviteStatus.ACCEPTED } });

    await this.auditService.log({
      userId: actor?.id ?? userId,
      userEmail: actor?.email,
      role: actor?.role,
      action: 'GROUP_MEMBER_ADD',
      entity: 'GROUP',
      entityId: invite.groupId,
      details: `Joined group ${group.fypId ?? `#${group.id}`} via invite`,
      ipAddress,
    });

    this.notificationService.createNotification(
      group.leaderId,
      'Invitation Accepted',
      `A student accepted your invitation to join group ${group.fypId ?? `#${group.id}`}`,
      'INVITE',
      '/dashboard/student/group',
    ).catch(() => {});

    const managers = await this.prisma.user.findMany({
      where: { role: Role.MANAGER, universityId: group.universityId },
      select: { id: true },
    });
    if (managers.length > 0) {
      this.notificationService.createMany(
        managers.map((m) => m.id),
        'Group Invitation Accepted',
        `A student joined group ${group.fypId ?? `#${group.id}`}`,
        'INVITE',
        '/dashboard/manager/groups',
      ).catch(() => {});
    }

    return this.findOne(invite.groupId);
  }

  async rejectInvite(inviteId: number, userId: number) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      include: { group: { select: { id: true, fypId: true, leaderId: true } } },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.invitedId !== userId) throw new ForbiddenException('This invite is not for you');
    if (invite.status !== InviteStatus.PENDING) throw new BadRequestException('Invite is no longer pending');

    await this.prisma.groupInvite.update({ where: { id: inviteId }, data: { status: InviteStatus.REJECTED } });

    this.notificationService.createNotification(
      invite.group.leaderId,
      'Invitation Rejected',
      `A student declined your invitation to join group ${invite.group.fypId ?? `#${invite.group.id}`}`,
      'INVITE',
      '/dashboard/student/group',
    ).catch(() => {});

    return { message: 'Invitation rejected' };
  }

  async getPendingInvites(userId: number) {
    return this.prisma.groupInvite.findMany({
      where: { invitedId: userId, status: InviteStatus.PENDING },
      include: {
        group: {
          include: {
            leader: { select: { id: true, name: true, email: true } },
            phase: { include: { session: { include: { program: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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

    const requireSocial = await this.prisma.systemSetting.findUnique({ where: { key: 'require_github_linkedin' } });
    if (requireSocial?.value === 'true') {
      const leader = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { githubUrl: true, linkedinUrl: true },
      });
      if (!leader?.githubUrl || !leader?.linkedinUrl) {
        throw new BadRequestException('Complete your profile first. Add GitHub & LinkedIn in Profile page.');
      }
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
    let fypId = group.fypId;
    if (!fypId) {
      fypId = await this.generateFypId(group.phaseId);
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
        `Group ${fypId ?? `#${group.id}`} has submitted their supervisor preferences`,
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
    await this.prisma.group.update({ where: { id: groupId }, data: { supervisorAssigned: true } });

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
      `You have been assigned as supervisor for group ${group.fypId ?? `#${group.id}`}`,
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

  async managerEditGroup(
    groupId: number,
    data: {
      addMemberEmail?: string;
      removeMemberId?: number;
      newLeaderId?: number;
      newSupervisorId?: number;
    },
    actor?: AuditActor | null,
    ipAddress?: string | null,
  ) {
    const group = await this.findOne(groupId);

    if (data.addMemberEmail !== undefined) {
      const user = await this.prisma.user.findUnique({
        where: { email: data.addMemberEmail },
        select: { id: true },
      });
      if (!user) throw new NotFoundException(`No user found with email "${data.addMemberEmail}"`);

      const existingEnrollment = await this.prisma.enrollment.findFirst({ where: { userId: user.id } });
      if (existingEnrollment) throw new ConflictException('This user is already enrolled in a group');

      if (group.members.length >= 3) throw new BadRequestException('Group already has the maximum of 3 members');

      await this.prisma.enrollment.create({ data: { userId: user.id, groupId } });

      await this.auditService.log({
        userId: actor?.id,
        userEmail: actor?.email,
        role: actor?.role,
        action: 'GROUP_MEMBER_ADD',
        entity: 'GROUP',
        entityId: groupId,
        details: `Added ${data.addMemberEmail} to group ${group.fypId ?? `#${groupId}`}`,
        ipAddress,
      });
    }

    if (data.removeMemberId !== undefined) {
      if (group.leaderId === data.removeMemberId) {
        throw new BadRequestException('Cannot remove the group leader. Change the leader first.');
      }
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { userId: data.removeMemberId, groupId },
      });
      if (!enrollment) throw new NotFoundException('Member not found in this group');
      await this.prisma.enrollment.delete({ where: { id: enrollment.id } });

      await this.auditService.log({
        userId: actor?.id,
        userEmail: actor?.email,
        role: actor?.role,
        action: 'GROUP_MEMBER_REMOVE',
        entity: 'GROUP',
        entityId: groupId,
        details: `Removed user #${data.removeMemberId} from group ${group.fypId ?? `#${groupId}`}`,
        ipAddress,
      });
    }

    if (data.newLeaderId !== undefined) {
      const isMember = group.members.some((m) => m.user?.id === data.newLeaderId);
      if (!isMember) throw new BadRequestException('New leader must be an existing group member');
      await this.prisma.group.update({ where: { id: groupId }, data: { leaderId: data.newLeaderId } });
    }

    if (data.newSupervisorId !== undefined) {
      await this.prisma.supervisorPreference.deleteMany({ where: { groupId } });
      await this.prisma.supervisorPreference.create({
        data: { groupId, supervisorId: data.newSupervisorId, preference: 1 },
      });
      await this.prisma.group.update({ where: { id: groupId }, data: { supervisorAssigned: true } });
    }

    return this.findOne(groupId);
  }

  async managerDeleteGroup(groupId: number, actor?: AuditActor | null, ipAddress?: string | null) {
    const group = await this.findOne(groupId);
    await this.prisma.groupInvite.deleteMany({ where: { groupId } });
    await this.prisma.supervisorPreference.deleteMany({ where: { groupId } });
    await this.prisma.enrollment.deleteMany({ where: { groupId } });
    await this.prisma.group.delete({ where: { id: groupId } });

    await this.auditService.log({
      userId: actor?.id,
      userEmail: actor?.email,
      role: actor?.role,
      action: 'GROUP_DELETE',
      entity: 'GROUP',
      entityId: groupId,
      details: `Deleted group ${group.fypId ?? `#${groupId}`}`,
      ipAddress,
    });

    return { message: 'Group deleted successfully' };
  }

  private async generateFypId(phaseId: number): Promise<string> {
    const phase = await this.prisma.fYPPhase.findUnique({
      where: { id: phaseId },
      include: { session: { include: { program: true } } },
    });
    if (!phase) throw new NotFoundException('FYP phase not found');

    const programCode = phase.session.program.code.toUpperCase();
    const { semester, year } = await this.adminService.getCurrentSemester();
    const semCode = semester === 'FALL' ? 'F' : 'S';
    const yearCode = String(year).slice(-2);

    const count = await this.prisma.group.count({ where: { phaseId, fypId: { not: null } } });
    const sequence = String(count + 1).padStart(3, '0');

    return `${programCode}-FYP-${semCode}${yearCode}-${sequence}`;
  }
}
