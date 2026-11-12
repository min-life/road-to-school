import { EnrollmentModule } from './enrollment/enrollment.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { Module } from '@nestjs/common';
import { IotDatabaseModule } from './database/iot-database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IotDevicesController } from './devices/iot-devices.controller.js';
import { IotDevicesService } from './devices/iot-devices.service.js';
import { IotScansController } from './scans/iot-scans.controller.js';
import { IotScansService } from './scans/iot-scans.service.js';
import { IotWifiController } from './wifi/iot-wifi.controller.js';
import { IotWifiService } from './wifi/iot-wifi.service.js';
import { IotFirmwareController } from './firmware/iot-firmware.controller.js';
import { IotScansGateway } from './realtime/iot-scans.gateway.js';
import { IotSecretsService } from './security/iot-secrets.service.js';
import { IotDeviceGuard } from './security/iot-device.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { IotAssignmentsService } from './assignments/iot-assignments.service.js';
import { IotAssignmentsController } from './assignments/iot-assignments.controller.js';
import { IotRuntimeService } from './assignments/iot-runtime.service.js';
import { IotRuntimeController } from './assignments/iot-runtime.controller.js';

@Module({
  imports: [AttendanceModule, EnrollmentModule, IotDatabaseModule, AuthModule, PrismaModule],
  controllers: [IotDevicesController, IotScansController, IotWifiController, IotFirmwareController, IotAssignmentsController, IotRuntimeController],
  providers: [IotDevicesService, IotScansService, IotWifiService, IotSecretsService, IotDeviceGuard, IotScansGateway, IotAssignmentsService, IotRuntimeService],
  exports: [IotDatabaseModule],
})
export class IotModule {}
