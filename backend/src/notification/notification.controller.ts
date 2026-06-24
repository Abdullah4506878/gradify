import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationService } from './notification.service';

interface AuthRequest extends Request {
  user: { id: number; email: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.notificationService.findAll(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthRequest) {
    return this.notificationService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markRead(id);
  }
}
