import { Module } from '@nestjs/common';
import { LeaveNoticesController } from './leave-notices.controller.js';
import { LeaveNoticesService } from './leave-notices.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LeaveNoticesController],
  providers: [LeaveNoticesService],
  exports: [LeaveNoticesService],
})
export class LeaveNoticesModule {}
