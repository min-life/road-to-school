import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import { ListIotQueryDto, RegisterIotDeviceDto } from '../dto/iot-request.dto.js';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import { isDuplicateKey, iotStorageUnavailable } from '../iot-api-errors.js';
import { advertisedIotUrl } from './iot-provisioning.js';
import { IotAssignmentsService } from '../assignments/iot-assignments.service.js';

export function deviceResponse(device: IotDevice) {
  return {
    deviceId: device.deviceId, name: device.name, macAddress: device.macAddress,
    chipModel: device.chipModel, firmwareVersion: device.firmwareVersion,
    status: device.lastSeenAt && Date.now() - device.lastSeenAt.getTime() <= 60000
      ? 'ONLINE' as const : 'OFFLINE' as const,
    lastSeenAt: device.lastSeenAt?.toISOString(),
    reportedAssignmentId: device.reportedAssignmentId ?? null, lastConfigAckAt: device.lastConfigAckAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(), updatedAt: device.updatedAt.toISOString(),
  };
}

@Injectable()
export class IotDevicesService {
  constructor(
    @InjectModel('IotDevice', IOT_CONNECTION) private readonly devices: Model<IotDevice>,
    private readonly secrets: IotSecretsService,
    private readonly config: ConfigService,
    private readonly assignments: IotAssignmentsService,
  ) {}

  async provision(dto: RegisterIotDeviceDto) {
    const backendUrl = advertisedIotUrl(this.config.get<string>('IOT_ADVERTISED_API_URL'));
    const mac = dto.macAddress.replaceAll(':', '').toUpperCase();
    if (dto.deviceId !== `ESP32_${mac}`) throw new BadRequestException('Định danh ESP32 không khớp MAC');
    // Validate the master key before any registration write.
    const deviceKey = this.secrets.deviceKey(dto.deviceId);
    let device: IotDevice | null;
    try { device = await this.devices.findOne({ deviceId: dto.deviceId }).lean().exec(); }
    catch { iotStorageUnavailable(); }
    if (!device) {
      try { device = await this.devices.create({ ...dto, macAddress: mac }); }
      catch (error) {
        if (!isDuplicateKey(error)) iotStorageUnavailable();
        // Another request may have registered the same board while this request was reading.
        try { device = await this.devices.findOne({ deviceId: dto.deviceId }).lean().exec(); }
        catch { iotStorageUnavailable(); }
      }
    }
    if (!device || device.macAddress.replaceAll(':', '').toUpperCase() !== mac) {
      throw new ConflictException('Định danh thiết bị không khớp bản đăng ký');
    }
    return { device: { ...deviceResponse(device), ...(await this.assignments.states([device]))[0] }, deviceKey, backendUrl };
  }

  async register(dto: RegisterIotDeviceDto) {
    const deviceKey = this.secrets.deviceKey(dto.deviceId);
    let device: IotDevice;
    try {
      device = await this.devices.create({ ...dto, macAddress: dto.macAddress.replaceAll(':', '') });
    } catch (error) {
      if (isDuplicateKey(error)) throw new ConflictException('Thiết bị đã được đăng ký');
      iotStorageUnavailable();
    }
    return { device: deviceResponse(device), deviceKey };
  }

  async list(query: ListIotQueryDto) {
    const filter = query.deviceId ? { deviceId: query.deviceId } : {};
    try {
      const [devices, total] = await Promise.all([
        this.devices.find(filter).sort({ createdAt: -1, _id: -1 })
          .skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(),
        this.devices.countDocuments(filter).exec(),
      ]);
      const states = await this.assignments.states(devices);
      return { data: devices.map((device, index) => ({ ...deviceResponse(device), ...states[index] })), total, page: query.page, limit: query.limit };
    } catch {
      iotStorageUnavailable();
    }
  }
}
