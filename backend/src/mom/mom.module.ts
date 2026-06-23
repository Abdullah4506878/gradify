import { Module } from '@nestjs/common';
import { MomController } from './mom.controller';
import { MomService } from './mom.service';

@Module({
  controllers: [MomController],
  providers: [MomService],
  exports: [MomService],
})
export class MomModule {}
