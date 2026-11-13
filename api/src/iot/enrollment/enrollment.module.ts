import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../../auth/auth.module.js';
import { IotDatabaseModule } from '../database/iot-database.module.js';
import { EnrollmentSessionsService } from './enrollment-sessions.service.js';
import { EnrollmentService } from './enrollment.service.js';
import {
  EnrollmentController,
  EnrollmentDeviceController,
  StudentRfidController,
} from './enrollment.controller.js';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
@Global()
@Module({
  imports: [PrismaModule, AuthModule, IotDatabaseModule],
  providers: [
    EnrollmentSessionsService,
    EnrollmentService,
    IotSecretsService,
    IotDeviceGuard,
  ],
  controllers: [
    EnrollmentController,
    EnrollmentDeviceController,
    StudentRfidController,
  ],
  exports: [EnrollmentSessionsService],
})
export class EnrollmentModule {}
