import { Module } from '@nestjs/common';
import { FypPhaseController } from './fyp-phase.controller';
import { FypPhaseService } from './fyp-phase.service';

@Module({
  controllers: [FypPhaseController],
  providers: [FypPhaseService],
  exports: [FypPhaseService],
})
export class FypPhaseModule {}
