import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditService } from './audit.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.SUPER_ADMIN)
  getLogs(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.auditService.findLogs({
      actorId: req.user.id,
      actorRole: req.user.role,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      entity,
      from,
      to,
      search,
    });
  }
}
