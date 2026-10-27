import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IncidentsService } from './incidents.service.js';
import { IncidentsDetectorService } from './incidents-detector.service.js';
import { IncidentsController } from './incidents.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentsDetectorService],
  exports: [IncidentsService, IncidentsDetectorService],
})
export class IncidentsModule {}
