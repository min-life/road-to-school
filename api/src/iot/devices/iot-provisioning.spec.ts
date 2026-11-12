import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { advertisedIotUrl } from './iot-provisioning.js';
import { IotDevicesService } from './iot-devices.service.js';
import type { RegisterIotDeviceDto } from '../dto/iot-request.dto.js';
import type { IotSecretsService } from '../security/iot-secrets.service.js';

// Technical URL parsing and failure paths only: no business fixtures or database writes.
describe('IoT provisioning configuration', () => {
  it('requires an operator-owned reachable URL', () => {
    for (const value of [undefined, '', 'http://localhost:3000/api/v1', 'http://127.1/api/v1',
      'http://[::1]/api/v1', 'http://[::]/api/v1', 'http://0.0.0.0/api/v1',
      'file:///api/v1', 'https://example.invalid/api', 'https://example.invalid/api/v1?x=1',
      'https://example.invalid/api/v1#', 'https://u:p@example.invalid/api/v1',
      ' https://example.invalid/api/v1', 'https://example.invalid\\api/v1']) {
      expect(() => advertisedIotUrl(value)).toThrow('IOT_ADVERTISED_API_URL');
    }
  });

  it('normalizes the trailing slash without network access', () => {
    expect(advertisedIotUrl('https://example.invalid/api/v1/')).toBe('https://example.invalid/api/v1');
  });

  it('rejects missing server configuration before accessing storage or credentials', async () => {
    const lookup = vi.fn(() => { throw new Error('Unexpected storage access'); });
    const key = vi.fn(() => { throw new Error('Unexpected credential access'); });
    const service = new IotDevicesService({ findOne: lookup } as never,
      { deviceKey: key } as unknown as IotSecretsService, { get: () => undefined } as unknown as ConfigService, {} as never);
    await expect(service.provision({} as RegisterIotDeviceDto)).rejects.toMatchObject({ status: 503 });
    expect(lookup).not.toHaveBeenCalled(); expect(key).not.toHaveBeenCalled();
  });

  it('rejects an absent hardware identity before storage access', async () => {
    const lookup = vi.fn(() => { throw new Error('Unexpected storage access'); });
    const service = new IotDevicesService({ findOne: lookup } as never, {} as IotSecretsService,
      new ConfigService({ IOT_ADVERTISED_API_URL: 'https://example.invalid/api/v1' }), {} as never);
    await expect(service.provision({ deviceId: '', macAddress: '' } as RegisterIotDeviceDto))
      .rejects.toMatchObject({ status: 400 });
    expect(lookup).not.toHaveBeenCalled();
  });
});
