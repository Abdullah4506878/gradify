import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcademicSessionModule } from './academic-session/academic-session.module';
import { AuthModule } from './auth/auth.module';
import { DepartmentModule } from './department/department.module';
import { FypPhaseModule } from './fyp-phase/fyp-phase.module';
import { GroupsModule } from './groups/groups.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramModule } from './program/program.module';
import { UniversityModule } from './university/university.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    UniversityModule,
    DepartmentModule,
    ProgramModule,
    AcademicSessionModule,
    FypPhaseModule,
    GroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
