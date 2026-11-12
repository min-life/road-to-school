import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

@Injectable()
export class IotSecretsService {
  constructor(private readonly config: ConfigService) {}

  private key(name: string): Buffer {
    const value = this.config.get<string>(name);
    if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) {
      throw new ServiceUnavailableException(
        `Cần cấu hình ${name} gồm 64 ký tự hex`,
      );
    }
    return Buffer.from(value, 'hex');
  }

  deviceKey(deviceId: string): string {
    return createHmac('sha256', this.key('IOT_DEVICE_AUTH_KEY'))
      .update(`road-to-school:iot:device:v1:${deviceId}`)
      .digest('hex');
  }

  verifyDeviceKey(deviceId: string, supplied: string): boolean {
    const expected = this.deviceKey(deviceId);
    return (
      /^[0-9a-f]{64}$/.test(supplied) &&
      timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(supplied, 'hex'),
      )
    );
  }
  attendanceSignature(payload: string): string {
    return createHmac('sha256', this.key('IOT_DEVICE_AUTH_KEY'))
      .update('road-to-school:iot:attendance:v1:' + payload)
      .digest('base64url');
  }
  verifyAttendanceSignature(payload: string, supplied: string): boolean {
    const expected = this.attendanceSignature(payload);
    return (
      /^[A-Za-z0-9_-]{43}$/.test(supplied) &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    );
  }

  encryptWifiPassword(
    deviceId: string,
    ssid: string,
    password: string,
  ): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key('IOT_WIFI_ENCRYPTION_KEY'),
      iv,
    );
    cipher.setAAD(Buffer.from(JSON.stringify([deviceId, ssid]), 'utf8'));
    const ciphertext = Buffer.concat([
      cipher.update(password, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      ciphertext.toString('base64'),
    ].join('.');
  }
}
