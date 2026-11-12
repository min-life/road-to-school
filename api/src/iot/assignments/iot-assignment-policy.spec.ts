import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { assertAssignmentTime } from './iot-assignment-policy.js';
import { AssignIotVehicleDto, IotHeartbeatDto } from './iot-assignment.dto.js';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import { IotDeviceSchema } from '../database/schemas/device.schema.js';
import { IotRfidScanSchema } from '../database/schemas/rfid-scan.schema.js';

// Technical time/DTO/crypto/schema checks only; no vehicle records or DB operations.
describe('IoT assignment boundaries', () => {
  const end = 1800000000000;
  it('accepts the start and excludes the exact release instant', () => {
    expect(() =>
      assertAssignmentTime(
        new Date(end - 1000),
        new Date(end),
        new Date(end - 1000),
        end,
      ),
    ).not.toThrow();
    expect(() =>
      assertAssignmentTime(
        new Date(end - 1000),
        new Date(end),
        new Date(end),
        end,
      ),
    ).toThrow();
    expect(() =>
      assertAssignmentTime(new Date(end), null, new Date(end - 1), end),
    ).toThrow();
  });
  it('bounds delayed delivery and clock skew for newly accepted scans', () => {
    expect(() =>
      assertAssignmentTime(new Date(0), null, new Date(end - 120000), end),
    ).not.toThrow();
    expect(() =>
      assertAssignmentTime(new Date(0), null, new Date(end - 120001), end),
    ).toThrow();
    expect(() =>
      assertAssignmentTime(new Date(0), null, new Date(end + 5001), end),
    ).toThrow();
  });
  it('requires explicit CAS state while accepting an explicit null for initial assignment', async () => {
    const missing = await validate(plainToInstance(AssignIotVehicleDto, {}));
    expect(
      missing.some((error) => error.property === 'expectedAssignmentId'),
    ).toBe(true);
    const initial = await validate(
      plainToInstance(AssignIotVehicleDto, { expectedAssignmentId: null }),
    );
    expect(
      initial.some((error) => error.property === 'expectedAssignmentId'),
    ).toBe(false);
    expect(initial.some((error) => error.property === 'vehicleId')).toBe(true);
  });
  it('requires an explicit heartbeat assignment even for an unbound device', async () => {
    expect(await validate(plainToInstance(IotHeartbeatDto, {}))).toHaveLength(
      1,
    );
    expect(
      await validate(plainToInstance(IotHeartbeatDto, { assignmentId: null })),
    ).toHaveLength(0);
  });
  it('authenticates path identity and rejects conflicting body identity', () => {
    const secrets = new IotSecretsService(
      new ConfigService({ IOT_DEVICE_AUTH_KEY: 'ab'.repeat(32) }),
    );
    const guard = new IotDeviceGuard(secrets);
    // ':' is a technical identifier accepted by the generic ID grammar; no registry record is created.
    const request = {
      params: { deviceId: ':' },
      headers: { 'x-iot-device-key': secrets.deviceKey(':') },
      body: {},
    };
    expect(guard.canActivate(new ExecutionContextHost([request]))).toBe(true);
    expect(() =>
      guard.canActivate(
        new ExecutionContextHost([{ ...request, body: { deviceId: '_' } }]),
      ),
    ).toThrow();
  });
  it('keeps legacy scan snapshots nullable and device telemetry separate from mapping', () => {
    for (const name of [
      'assignmentId',
      'vehicleId',
      'vehicleLicensePlateSnapshot',
    ]) {
      expect(IotRfidScanSchema.path(name).options.default).toBeNull();
    }
    expect(IotRfidScanSchema.indexes()).toContainEqual([
      { vehicleId: 1, scannedAt: -1 },
      {},
    ]);
    expect(Object.hasOwn(IotDeviceSchema.paths, 'currentVehicleId')).toBe(
      false,
    );
    expect(
      IotDeviceSchema.path('reportedAssignmentId').options.default,
    ).toBeNull();
  });
});
