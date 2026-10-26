import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RoutesController } from './routes.controller.js';
import { RoutesService } from './routes.service.js';
import { VietMapVRPService } from './vietmap-vrp.service.js';
import { ResourceAvailabilityService } from './resource-availability.service.js';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule],
  controllers: [RoutesController],
  providers: [RoutesService, VietMapVRPService, ResourceAvailabilityService],
  exports: [RoutesService, ResourceAvailabilityService, VietMapVRPService],
})
export class RoutesModule {}
