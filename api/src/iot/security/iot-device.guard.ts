import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { IotSecretsService } from './iot-secrets.service.js';
import { DEVICE_ID_PATTERN } from '../dto/iot-request.dto.js';

@Injectable()
export class IotDeviceGuard implements CanActivate {
  constructor(private readonly secrets: IotSecretsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const bodyId: unknown = (request.body as Record<string, unknown> | undefined)?.deviceId;
    const pathId: unknown = request.params?.deviceId;
    const deviceId = pathId ?? bodyId;
    const key = request.headers['x-iot-device-key'];
    if ((pathId !== undefined && bodyId !== undefined && pathId !== bodyId)
      || typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)
      || typeof key !== 'string' || !this.secrets.verifyDeviceKey(deviceId, key)) {
      throw new UnauthorizedException('Khóa thiết bị IoT không hợp lệ');
    }
    return true;
  }
}
