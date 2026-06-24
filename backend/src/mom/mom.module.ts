import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { MomController } from './mom.controller';
import { MomService } from './mom.service';

@Module({
  imports: [NotificationModule],
  controllers: [MomController],
  providers: [MomService],
  exports: [MomService],
})
export class MomModule {}
