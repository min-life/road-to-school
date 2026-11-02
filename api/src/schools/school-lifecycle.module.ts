import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ContractLifecycleService } from './contract-lifecycle.service.js';
import { ScheduledChangesService } from './scheduled-changes.service.js';

@Module({
  imports: [PrismaModule],
  providers: [ContractLifecycleService, ScheduledChangesService],
  exports: [ContractLifecycleService, ScheduledChangesService],
})
export class SchoolLifecycleModule {}
