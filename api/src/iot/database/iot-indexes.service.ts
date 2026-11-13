import type { EnrollmentSession } from '../enrollment/enrollment-session.schema.js';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from './schemas/device.schema.js';
import type { IotRfidScan } from './schemas/rfid-scan.schema.js';
import type { IotDeviceWifi } from './schemas/device-wifi.schema.js';

@Injectable()
export class IotIndexesService implements OnModuleInit {
  constructor(
    @InjectModel('IotDevice', IOT_CONNECTION) private readonly devices: Model<IotDevice>,
    @InjectModel('IotRfidScan', IOT_CONNECTION) private readonly scans: Model<IotRfidScan>,
    @InjectModel('IotDeviceWifi', IOT_CONNECTION) private readonly wifi: Model<IotDeviceWifi>,
    @InjectModel('RfidEnrollmentSession', IOT_CONNECTION) private readonly enrollments: Model<EnrollmentSession>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Never accept scans before their unique index is ready. No syncIndexes/drop.
    await Promise.all([this.devices.init(), this.scans.init(), this.wifi.init(), this.enrollments.init()]);
  }
}
