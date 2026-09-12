import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService } from './github.service';

@Injectable()
export class GithubCron {
  private readonly logger = new Logger(GithubCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {}

  /** Every Sunday at 11 PM. */
  @Cron('0 23 * * 0')
  async syncWeeklyCommits() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'github_tracking_enabled' },
    });
    if (setting?.value === 'false') {
      this.logger.log('GitHub commit tracking is disabled — skipping weekly sync');
      return;
    }

    const weekStart = this.getCompletedWeekStart();
    const students = await this.prisma.user.findMany({
      where: { role: Role.STUDENT, githubUrl: { not: null } },
      select: { id: true, githubUrl: true },
    });

    this.logger.log(
      `Syncing GitHub commits for ${students.length} student(s) — week of ${weekStart.toISOString().slice(0, 10)}`,
    );

    for (const student of students) {
      if (!student.githubUrl) continue;
      try {
        const { commitCount, lastCommit, repos } = await this.githubService.fetchUserCommits(
          student.githubUrl,
          weekStart,
        );
        await this.prisma.weeklyCommit.upsert({
          where: { userId_weekStart: { userId: student.id, weekStart } },
          create: { userId: student.id, weekStart, commitCount, lastCommit, repos },
          update: { commitCount, lastCommit, repos },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to sync commits for user #${student.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  /** Sunday 00:00 of the week that just concluded (this job runs the following Sunday night). */
  private getCompletedWeekStart(): Date {
    const now = new Date();
    const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    const startOfCompletedWeek = new Date(startOfCurrentWeek);
    startOfCompletedWeek.setDate(startOfCurrentWeek.getDate() - 7);
    return startOfCompletedWeek;
  }
}
