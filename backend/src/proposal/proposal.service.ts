import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProposalDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const existing = await this.prisma.proposal.findUnique({ where: { groupId: dto.groupId } });
    if (existing) throw new ConflictException('A proposal for this group already exists');

    return this.prisma.proposal.create({
      data: {
        groupId: dto.groupId,
        projectTitle: dto.projectTitle,
        problemStatement: dto.problemStatement,
        proposedSolution: dto.proposedSolution,
      },
      include: PROPOSAL_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.proposal.findMany({
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
    await this.findOne(id);

    if (role !== Role.SUPERVISOR && role !== Role.MANAGER) {
      throw new ForbiddenException('Only supervisors and managers can review proposals');
    }

    return this.prisma.proposal.update({
      where: { id },
      data: {
        status: dto.status,
        supervisorComments: dto.supervisorComments,
      },
      include: PROPOSAL_INCLUDE,
    });
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
