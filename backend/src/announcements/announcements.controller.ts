import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('active')
  getActive() {
    return this.prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, message: true, createdAt: true },
    });
  }
}
