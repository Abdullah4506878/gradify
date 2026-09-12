import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditActor {
  id: number;
  email: string;
  role: Role;
}

export interface AuditLogInput {
  userId?: number | null;
  userEmail?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: string | null;
  ipAddress?: string | null;
}

export interface FindAuditLogsParams {
  actorId: number;
  actorRole: Role;
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  search?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Writes one audit entry. Never throws — a logging failure must not break the caller's operation. */
  async log(data: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId ?? null,
          userEmail: data.userEmail ?? null,
          role: data.role ?? null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId ?? null,
          details: data.details ?? null,
          ipAddress: data.ipAddress ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Paginated, filtered log lookup. MANAGER is scoped to their own university; SUPER_ADMIN sees all. */
  async findLogs(params: FindAuditLogsParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;

    const where: Record<string, unknown> = {};

    if (params.actorRole === Role.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: params.actorId },
        select: { universityId: true },
      });
      // No university on record → force an empty result set rather than leaking all logs.
      where.user = { universityId: manager?.universityId ?? -1 };
    }

    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;

    if (params.from || params.to) {
      const createdAt: Record<string, Date> = {};
      if (params.from) createdAt.gte = new Date(params.from);
      if (params.to) createdAt.lte = new Date(params.to);
      where.createdAt = createdAt;
    }

    if (params.search) {
      const q = params.search;
      where.OR = [
        { userEmail: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { entity: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
