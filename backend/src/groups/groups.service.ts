import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupStatus, Role, Semester } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(leaderId: number, dto: CreateGroupDto) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { userId: leaderId, group: { phaseId: dto.phaseId } },
    });
    if (existing) throw new ConflictException('You are already in a group for this phase');

    const fypId = await this.generateFypId(dto.phaseId);

    const group = await this.prisma.group.create({
      data: {
        fypId,
        phaseId: dto.phaseId,
        universityId: dto.universityId,
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
          ? { preferences: { some: { supervisorId: user.id } } }
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

    return this.findOne(groupId);
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

    const count = await this.prisma.group.count({ where: { phaseId } });
    const sequence = String(count + 1).padStart(3, '0');

    return `${programCode}-FYP-${semCode}${year}-${sequence}`;
  }
}
