import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AcademicSessionModule } from './academic-session/academic-session.module';
import { AuthModule } from './auth/auth.module';
import { DepartmentModule } from './department/department.module';
import { FypPhaseModule } from './fyp-phase/fyp-phase.module';
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
    PrismaModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
