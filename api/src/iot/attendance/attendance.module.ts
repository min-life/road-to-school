import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { SchoolLifecycleModule } from '../../schools/school-lifecycle.module.js';
import { IotDatabaseModule } from '../database/iot-database.module.js';
import { EnrollmentModule } from '../enrollment/enrollment.module.js';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import { AttendanceContextService } from './attendance-context.service.js';
import { AttendanceStore } from './attendance-store.service.js';
import { AttendanceService } from './attendance.service.js';
import {
  AttendanceDeviceController,
  AttendanceTripController,
} from './attendance.controller.js';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SchoolLifecycleModule,
    IotDatabaseModule,
    EnrollmentModule,
  ],
  providers: [
    IotSecretsService,
    IotDeviceGuard,
    AttendanceContextService,
    AttendanceStore,
    AttendanceService,
  ],
  controllers: [AttendanceDeviceController, AttendanceTripController],
  exports: [AttendanceContextService],
})
export class AttendanceModule {}
