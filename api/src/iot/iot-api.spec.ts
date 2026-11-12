import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createDecipheriv } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { IotSecretsService } from './security/iot-secrets.service.js';
import { IotDeviceGuard } from './security/iot-device.guard.js';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { IotScansService } from './scans/iot-scans.service.js';
import { IotDevicesService } from './devices/iot-devices.service.js';
import { IotWifiService } from './wifi/iot-wifi.service.js';
import { IotFirmwareController } from './firmware/iot-firmware.controller.js';
import { IotScansGateway } from './realtime/iot-scans.gateway.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ListIotScansQueryDto, ReceiveIotScanDto, SaveIotWifiDto } from './dto/iot-request.dto.js';
import { IotIndexesService } from './database/iot-indexes.service.js';

// Only technical crypto inputs, validation failures and fail-closed mocks.
// No business documents/fixtures, successful fake API responses or database access.
const technicalKey = 'ab'.repeat(32);
function secrets() {
  return new IotSecretsService(new ConfigService({
    IOT_DEVICE_AUTH_KEY: technicalKey, IOT_WIFI_ENCRYPTION_KEY: technicalKey,
  }));
}

describe('IoT API security and validation', () => {
  it('binds a device credential to its exact identity', () => {
    const service = secrets();
    const key = service.deviceKey('');
    expect(service.verifyDeviceKey('', key)).toBe(true);
    expect(service.verifyDeviceKey(' ', key)).toBe(false);
    expect(service.verifyDeviceKey('', 'invalid')).toBe(false);
  });

  it('fails closed when device credentials are not configured', () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    expect(() => new IotSecretsService(config).deviceKey('')).toThrow('IOT_DEVICE_AUTH_KEY');
  });

  it('encrypts with randomized authenticated encryption bound to device and SSID', () => {
    const service = secrets();
    const first = service.encryptWifiPassword('', '', '');
    const second = service.encryptWifiPassword('', '', '');
    expect(first).not.toBe(second);
    const [version, iv, tag, ciphertext] = first.split('.');
    expect(version).toBe('v1');
    const decrypt = (aad: string) => {
      const cipher = createDecipheriv('aes-256-gcm', Buffer.from(technicalKey, 'hex'), Buffer.from(iv, 'base64'));
      cipher.setAAD(Buffer.from(aad));
      cipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([cipher.update(Buffer.from(ciphertext, 'base64')), cipher.final()]);
    };
    expect(decrypt(JSON.stringify(['', ''])).length).toBe(0);
    expect(() => decrypt(JSON.stringify([' ', '']))).toThrow();
  });

  it('rejects absent credentials before any device lookup', () => {
    const guard = new IotDeviceGuard(secrets());
    expect(() => guard.canActivate(new ExecutionContextHost([{ headers: {}, body: {} }]))).toThrow();
  });

  it('rejects missing scan identity, timezone and unknown properties', async () => {
    const dto = plainToInstance(ReceiveIotScanDto, { scannedAt: '2026-11-04T12:00:00', extra: true });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining([
      'scanId', 'deviceId', 'cardUid', 'scannedAt', 'extra',
    ]));
  });

  it('rejects unbounded pagination and malformed UID filters', async () => {
    const dto = plainToInstance(ListIotScansQueryDto, { page: '0', limit: '101', cardUid: 'invalid' });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['page', 'limit', 'cardUid']),
    );
  });

  it('rejects null card type rather than silently passing it to storage', async () => {
    const errors = await validate(plainToInstance(ReceiveIotScanDto, { cardType: null }));
    expect(errors.some((error) => error.property === 'cardType')).toBe(true);
  });

  it('rejects empty SSID and short Wi-Fi passwords', async () => {
    const errors = await validate(plainToInstance(SaveIotWifiDto, { ssid: '', password: '' }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['ssid', 'password']));
  });

  it('does not touch MongoDB for an invalid scan timestamp', async () => {
    const deviceLookup = vi.fn();
    const service = new IotScansService(
      { findOneAndUpdate: deviceLookup } as never, {} as never, {} as never, {} as never,
    );
    await expect(service.receive({ scannedAt: 'invalid' } as ReceiveIotScanDto)).rejects.toThrow();
    expect(deviceLookup).not.toHaveBeenCalled();
  });

  it('turns storage failures into sanitized 503 errors', async () => {
    const service = new IotDevicesService({
      find: () => { throw new Error('Internal driver details'); },
    } as never, secrets(), new ConfigService(), {} as never);
    await expect(service.list(new ListIotScansQueryDto())).rejects.toMatchObject({ status: 503 });
  });

  it('rejects an oversized UTF-8 SSID before encryption or storage', async () => {
    const service = new IotWifiService({} as never, {} as never, secrets());
    await expect(service.save({ ssid: '界'.repeat(11) } as SaveIotWifiDto)).rejects.toMatchObject({ status: 400 });
  });

  it('returns 503 when no actual firmware is configured', async () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    await expect(new IotFirmwareController(config).latest()).rejects.toMatchObject({ status: 503 });
  });

  it('refuses Socket.IO authentication without a token, without accessing PostgreSQL', async () => {
    const read = vi.fn(() => { throw new Error('Unexpected database access'); });
    const guard = new AuthGuard(new JwtService(), new ConfigService(), { session: { findUnique: read } } as unknown as PrismaService);
    const gateway = new IotScansGateway(guard);
    let middleware: ((socket: unknown, next: (error?: Error) => void) => void) | undefined;
    gateway.afterInit({ use: (fn: typeof middleware) => { middleware = fn; } } as never);
    const error = await new Promise<Error | undefined>((resolve) => {
      middleware!({ handshake: { auth: {} } }, resolve);
    });
    expect(error?.message).toBe('Unauthorized');
    expect(read).not.toHaveBeenCalled();
  });

  it('disconnects an expired or revoked Socket.IO session before delivering data', async () => {
    const auth = { canActivate: vi.fn().mockRejectedValue(new Error('Revoked')) } as unknown as AuthGuard;
    const gateway = new IotScansGateway(auth);
    const socket = { handshake: { auth: { token: 'invalid' } }, emit: vi.fn(), disconnect: vi.fn() };
    Reflect.set(gateway, 'server', { sockets: new Map([['connection', socket]]) });
    await gateway.publish({} as never);
    expect(socket.emit).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('does not finish startup before unique indexes are ready', async () => {
    let finishIndexes: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { finishIndexes = resolve; });
    const init = vi.fn(() => pending);
    const index = new IotIndexesService({ init } as never, { init } as never, { init } as never, { init } as never);
    let ready = false;
    const startup = index.onModuleInit().then(() => { ready = true; });
    await Promise.resolve();
    expect(ready).toBe(false);
    expect(init).toHaveBeenCalledTimes(4);
    finishIndexes!();
    await startup;
    expect(ready).toBe(true);
  });
});
