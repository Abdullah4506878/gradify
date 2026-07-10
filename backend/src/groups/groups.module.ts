import { Module } from '@nestjs/common';
import { AcademicSessionModule } from '../academic-session/academic-session.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [UsersModule, NotificationModule, AdminModule, AcademicSessionModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
