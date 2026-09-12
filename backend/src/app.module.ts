import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AcademicSessionModule } from './academic-session/academic-session.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DepartmentModule } from './department/department.module';
import { FypPhaseModule } from './fyp-phase/fyp-phase.module';
import { GithubModule } from './github/github.module';
import { GroupsModule } from './groups/groups.module';
import { MomModule } from './mom/mom.module';
import { NotificationModule } from './notification/notification.module';
import { ProposalModule } from './proposal/proposal.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramModule } from './program/program.module';
import { UniversityModule } from './university/university.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AdminModule,
    UsersModule,
    AuthModule,
    UniversityModule,
    DepartmentModule,
    ProgramModule,
    AcademicSessionModule,
    FypPhaseModule,
    GroupsModule,
    MomModule,
    TasksModule,
    ProposalModule,
    NotificationModule,
    SettingsModule,
    GithubModule,
    AnnouncementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
