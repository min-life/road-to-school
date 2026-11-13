import { EnrollmentSessionSchema } from '../enrollment/enrollment-session.schema.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IOT_CONNECTION } from '../iot.constants.js';
import { createIotDatabaseOptions } from './iot-database.options.js';
import { IotDeviceSchema } from './schemas/device.schema.js';
import { IotRfidScanSchema } from './schemas/rfid-scan.schema.js';
import { IotDeviceWifiSchema } from './schemas/device-wifi.schema.js';
import { IotIndexesService } from './iot-indexes.service.js';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      connectionName: IOT_CONNECTION,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createIotDatabaseOptions(config.get<string>('MONGODB_IOT_URI')),
    }),
    MongooseModule.forFeature(
      [
        { name: 'IotDevice', schema: IotDeviceSchema },
        { name: 'RfidEnrollmentSession', schema: EnrollmentSessionSchema },
        { name: 'IotRfidScan', schema: IotRfidScanSchema },
        { name: 'IotDeviceWifi', schema: IotDeviceWifiSchema },
      ],
      IOT_CONNECTION,
    ),
  ],
  providers: [IotIndexesService],
  exports: [MongooseModule],
})
export class IotDatabaseModule {}
