import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

// Global: AuditService is injected from auth/users/groups/tasks services across
// the app, so every consumer would otherwise need to import this module directly.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
