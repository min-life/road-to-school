import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import type { IotDeviceWifi } from '../database/schemas/device-wifi.schema.js';
import { SaveIotWifiDto } from '../dto/iot-request.dto.js';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import { iotStorageUnavailable } from '../iot-api-errors.js';

@Injectable()
export class IotWifiService {
  constructor(
    @InjectModel('IotDevice', IOT_CONNECTION) private readonly devices: Model<IotDevice>,
    @InjectModel('IotDeviceWifi', IOT_CONNECTION) private readonly wifi: Model<IotDeviceWifi>,
    private readonly secrets: IotSecretsService,
  ) {}

  async save(dto: SaveIotWifiDto) {
    if (Buffer.byteLength(dto.ssid, 'utf8') > 32 || dto.ssid.includes('\0')) {
      throw new BadRequestException('SSID tối đa 32 byte UTF-8 và không chứa ký tự NUL');
    }
    const passwordEncrypted = this.secrets.encryptWifiPassword(dto.deviceId, dto.ssid, dto.password);
    let exists: unknown;
    try { exists = await this.devices.exists({ deviceId: dto.deviceId }); }
    catch { iotStorageUnavailable(); }
    if (!exists) throw new NotFoundException('Thiết bị chưa đăng ký');
    try {
      // No delivery/ACK protocol yet: saving can never mark the ESP32 configured.
      await this.wifi.updateOne({ deviceId: dto.deviceId }, {
        $set: { ssid: dto.ssid, passwordEncrypted, passwordMasked: '********', isConfigured: false },
        $setOnInsert: { deviceId: dto.deviceId },
      }, { upsert: true, runValidators: true }).exec();
      const saved = await this.wifi.findOne({ deviceId: dto.deviceId }).lean().exec();
      if (!saved) iotStorageUnavailable();
      return {
        deviceId: saved.deviceId, ssid: saved.ssid, passwordMasked: '********',
        isConfigured: saved.isConfigured, updatedAt: saved.updatedAt.toISOString(),
      };
    } catch { iotStorageUnavailable(); }
  }
}
