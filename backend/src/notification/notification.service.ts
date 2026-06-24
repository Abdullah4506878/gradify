import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    link?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, title, message, type, link },
    });
  }

  createMany(
    userIds: number[],
    title: string,
    message: string,
    type: string,
    link?: string,
  ) {
    if (userIds.length === 0) return Promise.resolve();
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, title, message, type, link })),
    });
  }

  findAll(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  markRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
