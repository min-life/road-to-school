import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  attendancePhase,
  receiptField,
  candidateLive,
  alreadyRecorded,
  attendanceAllowed,
} from './attendance-policy.js';
import {
  AttendanceContextService,
  type AttendanceContext,
} from './attendance-context.service.js';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import {
  AttendanceTripController,
  AttendanceDeviceController,
} from './attendance.controller.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import {
  AttendanceActionDto,
  AttendanceScanDto,
  AttendanceListQueryDto,
} from './attendance.dto.js';
import { AttendanceStore } from './attendance-store.service.js';
import { IotRfidScanSchema } from '../database/schemas/rfid-scan.schema.js';
import { lockTripOperation } from '../../trips/attendance-operations.js';
// Pure protocol/state/crypto/schema contracts only; no Student/Trip records or DB writes.
describe('RFID attendance protocol contracts', () => {
  it('can lock and check contract policy without materializing school lifecycle on a read-only receipt path', async () => {
    // Query-scope projection only: no business records and no database connection.
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      trip: {
        findUnique: vi.fn().mockResolvedValue({ schoolId: 'query-scope' }),
      },
      school: { findUnique: vi.fn() },
    };
    const lifecycle = {
      reconcileSchool: vi.fn(),
      assertTripContractOpen: vi.fn().mockResolvedValue(undefined),
    };
    await lockTripOperation(
      tx as never,
      'lock-scope',
      lifecycle as never,
      false,
    );
    expect(lifecycle.reconcileSchool).not.toHaveBeenCalled();
    expect(tx.school.findUnique).not.toHaveBeenCalled();
    expect(lifecycle.assertTripContractOpen).toHaveBeenCalledWith(
      'lock-scope',
      tx,
    );
  });
  it('maps readiness and trip phase without counting physical taps', () => {
    for (const [direction, status, ready, arrived, expected] of [
      ['TO_SCHOOL', 'SCHEDULED', true, false, null],
      ['TO_SCHOOL', 'IN_PROGRESS', false, false, null],
      ['TO_SCHOOL', 'IN_PROGRESS', true, false, 'BOARDING'],
      ['TO_SCHOOL', 'IN_PROGRESS', true, true, 'ALIGHTING'],
      ['TO_PARKING', 'SCHEDULED', true, false, 'BOARDING'],
      ['TO_PARKING', 'IN_PROGRESS', true, false, 'ALIGHTING'],
      ['TO_PARKING', 'COMPLETED', true, false, null],
      ['TO_SCHOOL', 'CANCELLED', true, true, null],
    ] as const) {
      expect(
        attendancePhase({
          direction,
          status,
          attendantReadyAt: ready ? new Date(0) : null,
          arrivedAtSchoolAt: arrived ? new Date(0) : null,
        }),
      ).toBe(expected);
    }
  });
  it('selects independent durable receipts and does not infer alighting from PRESENT', () => {
    expect(receiptField('BOARDING')).toBe('rfidBoardingScanId');
    expect(receiptField('ALIGHTING')).toBe('rfidAlightingScanId');
    expect(
      alreadyRecorded({ status: 'PRESENT', alightedAt: null }, 'ALIGHTING'),
    ).toBe(false);
    expect(
      alreadyRecorded({ status: 'PRESENT', alightedAt: null }, 'BOARDING'),
    ).toBe(true);
  });
  it('rejects manual override, absence and an alighting without boarding', () => {
    expect(() =>
      attendanceAllowed(
        { status: 'UNMARKED', rfidBoardingScanId: 'receipt' } as never,
        'BOARDING',
      ),
    ).toThrow();
    expect(() =>
      attendanceAllowed({ status: 'ABSENT' } as never, 'BOARDING'),
    ).toThrow();
    expect(() =>
      attendanceAllowed({ status: 'UNMARKED' } as never, 'ALIGHTING'),
    ).toThrow();
  });
  it('authenticates opaque context and rejects tampering, wrong device and expiry', () => {
    const config = new ConfigService({ IOT_DEVICE_AUTH_KEY: 'a'.repeat(64) });
    const service = new AttendanceContextService(
      new IotSecretsService(config),
      config,
    );
    const c: AttendanceContext = {
      v: 1,
      deviceId: 'protocol-device',
      assignmentId: 'assignment',
      tripId: 'trip',
      phase: 'BOARDING',
      version: '0'.repeat(64),
      attendantId: 'actor',
      issuedAt: 100,
      expiresAt: 160,
    };
    const token = service.encode(c);
    expect(service.decode(token, 'protocol-device', 120)).toEqual(c);
    expect(() => service.decode(token, 'other-device', 120)).toThrow();
    expect(() => service.decode(token, 'protocol-device', 160)).toThrow();
    const [payload, signature] = token.split('.');
    expect(() =>
      service.decode(
        payload + '.' + (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1),
        'protocol-device',
        120,
      ),
    ).toThrow();
    expect(() =>
      service.decode(
        service.encode({ ...c, expiresAt: 161 }),
        'protocol-device',
        120,
      ),
    ).toThrow();
  });
  it('requires device-key capture and assigned BUS_ATTENDANT actions', () => {
    expect(Reflect.getMetadata('roles', AttendanceTripController)).toEqual([
      'BUS_ATTENDANT',
    ]);
    expect(
      Reflect.getMetadata('__guards__', AttendanceDeviceController),
    ).toEqual([IotDeviceGuard]);
  });
  it('requires a context and rejects arbitrary Student/UID in an action', async () => {
    const errors = await validate(plainToInstance(AttendanceScanDto, {}));
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['scanId', 'cardUid', 'contextToken']),
    );
    expect(errors.some((e) => e.property === 'sessionId')).toBe(false);
    expect(
      plainToInstance(AttendanceScanDto, {
        scanId: '00000000-0000-4000-8000-0000000000AB',
      }).scanId,
    ).toBe('00000000-0000-4000-8000-0000000000ab');
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { studentId: '_', cardUid: '00000000', phase: 'BOARDING' },
        { type: 'body', metatype: AttendanceActionDto },
      ),
    ).rejects.toThrow();
    expect(plainToInstance(AttendanceListQueryDto, {}).view).toBe('queue');
  });
  it('expires candidates without deleting history or requiring metadata on legacy raw scans', () => {
    expect(() => candidateLive(new Date(1000), 1000)).toThrow();
    expect(() => candidateLive(new Date(1001), 1000)).not.toThrow();
    expect(IotRfidScanSchema.path('tripId').isRequired).toBeFalsy();
    expect(IotRfidScanSchema.path('purpose').options.default).toBeUndefined();
    expect(
      IotRfidScanSchema.indexes().some(
        ([, o]) => o.expireAfterSeconds !== undefined,
      ),
    ).toBe(false);
  });
  it('bounds network stalls without claiming cancellation', async () => {
    vi.useFakeTimers();
    try {
      const store = new AttendanceStore(undefined as never);
      const rejection = expect(
        store.io(() => new Promise<never>(() => {})),
      ).rejects.toMatchObject({ status: 503 });
      await vi.advanceTimersByTimeAsync(2500);
      await rejection;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
