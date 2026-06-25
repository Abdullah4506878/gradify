import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ManagerReviewProposalDto, ReviewProposalDto } from './dto/review-proposal.dto';

const PROPOSAL_INCLUDE = {
  group: {
    select: {
      id: true,
      fypId: true,
      leader: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

@Injectable()
export class ProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateProposalDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const existing = await this.prisma.proposal.findUnique({ where: { groupId: dto.groupId } });
    if (existing) throw new ConflictException('A proposal for this group already exists');

    const proposal = await this.prisma.proposal.create({
      data: {
        groupId: dto.groupId,
        projectTitle: dto.projectTitle,
        problemStatement: dto.problemStatement,
        proposedSolution: dto.proposedSolution,
      },
      include: PROPOSAL_INCLUDE,
    });

    // Notify P1 supervisor preference
    const p1 = await this.prisma.supervisorPreference.findFirst({
      where: { groupId: dto.groupId, preference: 1 },
    });
    if (p1) {
      this.notificationService.createNotification(
        p1.supervisorId,
        'New Proposal Submitted',
        `Group ${group.fypId} has submitted their project idea for review`,
        'PROPOSAL',
        '/dashboard/supervisor/proposals',
      ).catch(() => {});
    }

    return proposal;
  }

  async findAll(user?: { id: number; role: Role }) {
    let where = {};
    if (user?.role === Role.SUPERVISOR) {
      const assigned = await this.prisma.supervisorPreference.findMany({
        where: { supervisorId: user.id, preference: 1 },
        select: { groupId: true },
      });
      where = { groupId: { in: assigned.map((a) => a.groupId) } };
    }
    return this.prisma.proposal.findMany({
      where,
      include: PROPOSAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyProposal(userId: number) {
    const group = await this.prisma.group.findFirst({
      where: {
        OR: [
          { leaderId: userId },
          { members: { some: { userId } } },
        ],
      },
    });
    if (!group) return null;

    return this.prisma.proposal.findUnique({
      where: { groupId: group.id },
      include: PROPOSAL_INCLUDE,
    });
  }

  async findOne(id: number) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: PROPOSAL_INCLUDE,
    });
    if (!proposal) throw new NotFoundException(`Proposal #${id} not found`);
    return proposal;
  }

  async review(id: number, userId: number, role: Role, dto: ReviewProposalDto) {
    const proposal = await this.findOne(id);

    if (role !== Role.SUPERVISOR && role !== Role.MANAGER) {
      throw new ForbiddenException('Only supervisors and managers can review proposals');
    }

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: dto.status,
        supervisorComments: dto.supervisorComments,
      },
      include: PROPOSAL_INCLUDE,
    });

    // Notify all group members on approval or rejection
    if (dto.status === ProposalStatus.APPROVED || dto.status === ProposalStatus.REJECTED) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { groupId: proposal.group.id },
        select: { userId: true },
      });
      const memberIds = [
        ...new Set([
          ...enrollments.map((e) => e.userId),
          proposal.group.leader.id,
        ]),
      ];

      memberIds.forEach((uid) => console.log('Sending notification to userId:', uid));
      this.notificationService.createMany(
        memberIds,
        dto.status === ProposalStatus.APPROVED ? 'Proposal Approved ✓' : 'Proposal Needs Revision',
        dto.status === ProposalStatus.APPROVED
          ? 'Your project idea has been approved by your supervisor'
          : 'Your supervisor has requested changes to your proposal',
        'PROPOSAL_REVIEW',
        '/dashboard/student/proposal',
      ).catch(() => {});
    }

    return updated;
  }

  async managerReview(id: number, dto: ManagerReviewProposalDto) {
    await this.findOne(id);

    return this.prisma.proposal.update({
      where: { id },
      data: { managerComments: dto.managerComments },
      include: PROPOSAL_INCLUDE,
    });
  }
}
