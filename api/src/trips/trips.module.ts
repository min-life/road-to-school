import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';
import { TripNavigationService } from './trip-navigation.service.js';
import { TripNavigationController } from './trip-navigation.controller.js';
import { VietMapNavigationService } from './vietmap-navigation.service.js';
import { IncidentsModule } from '../incidents/incidents.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    IncidentsModule,
  ],
  controllers: [TripsController, TripNavigationController],
  providers: [TripsService, TripNavigationService, VietMapNavigationService],
  exports: [TripsService],
})
export class TripsModule {}
