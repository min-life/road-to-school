import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StudentRequestsService } from './student-requests.service.js';
import { ParentRequestsController } from './parent-requests.controller.js';
import { SchoolRequestsController } from './school-requests.controller.js';
import { SystemRequestsController } from './system-requests.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ParentRequestsController,
    SchoolRequestsController,
    SystemRequestsController,
  ],
  providers: [StudentRequestsService],
  exports: [StudentRequestsService],
})
export class StudentRequestsModule {}
