import {
  EnrollmentController,
  EnrollmentDeviceController,
  StudentRfidController,
} from './enrollment.controller.js';
import { IotDeviceGuard } from '../security/iot-device.guard.js';
import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { EnrollmentSessionsService } from './enrollment-sessions.service.js';
import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  effectiveOpen,
  assertCaptureTime,
  bindingMatchesSession,
  requireDifferentCard,
} from './enrollment-policy.js';
import { EnrollmentSessionSchema } from './enrollment-session.schema.js';
import {
  EnrollmentScanDto,
  ConfirmEnrollmentDto,
  EnrollmentQueryDto,
  StartEnrollmentDto,
  RevokeStudentRfidDto,
} from './enrollment.dto.js';
// Technical time windows, request validation and index definitions only. No business fixtures/DB writes.
describe('RFID enrollment safety contracts', () => {
  it('bounds a stalled store operation without claiming to cancel its write', async () => {
    vi.useFakeTimers();
    try {
      const store = new EnrollmentSessionsService(undefined as never);
      const result = store.io(() => new Promise<never>(() => {}));
      const rejected = expect(result).rejects.toMatchObject({ status: 503 });
      await vi.advanceTimersByTimeAsync(2500);
      await rejected;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it('keeps admin registration SYSADMIN-only and device capture on device-key authentication', () => {
    expect(Reflect.getMetadata('roles', EnrollmentController)).toEqual([
      'SYSTEM_ADMIN',
    ]);
    expect(Reflect.getMetadata('roles', StudentRfidController)).toEqual([
      'SYSTEM_ADMIN',
    ]);
    expect(
      Reflect.getMetadata('__guards__', EnrollmentDeviceController),
    ).toEqual([IotDeviceGuard]);
  });
  it('matches a replacement against its immutable prior UID and handles legacy register mode', () => {
    expect(bindingMatchesSession({}, null)).toBe(true);
    expect(bindingMatchesSession({}, '00000000')).toBe(false);
    expect(
      bindingMatchesSession(
        { operation: 'REPLACE', expectedPreviousCardUid: '00000000' },
        '00000000',
      ),
    ).toBe(true);
    expect(
      bindingMatchesSession(
        { operation: 'REPLACE', expectedPreviousCardUid: '00000000' },
        null,
      ),
    ).toBe(false);
    expect(
      bindingMatchesSession(
        { operation: 'REPLACE', expectedPreviousCardUid: '00000000' },
        '11111111',
      ),
    ).toBe(false);
    expect(bindingMatchesSession({ operation: 'REPLACE' }, null)).toBe(false);
  });
  it('rejects a physical tap of the currently linked card while allowing a different candidate', () => {
    expect(() => requireDifferentCard('00000000', '00000000')).toThrow();
    expect(() => requireDifferentCard('00000000', '11111111')).not.toThrow();
    expect(() => requireDifferentCard(null, '00000000')).not.toThrow();
  });
  it('defaults legacy starts to REGISTER and requires prior UID/version for REPLACE', async () => {
    expect(plainToInstance(StartEnrollmentDto, {}).operation).toBe('REGISTER');
    const errors = await validate(
      plainToInstance(StartEnrollmentDto, { operation: 'REPLACE' }),
    );
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining([
        'expectedPreviousCardUid',
        'expectedStudentVersion',
      ]),
    );
    const register = await validate(plainToInstance(StartEnrollmentDto, {}));
    expect(
      register.some(
        (e) =>
          e.property === 'expectedPreviousCardUid' ||
          e.property === 'expectedStudentVersion',
      ),
    ).toBe(false);
    const invalid = await validate(
      plainToInstance(StartEnrollmentDto, { operation: 'OTHER' }),
    );
    expect(invalid.map((e) => e.property)).toContain('operation');
  });
  it('requires a well-formed expected binding when revoking instead of accepting a target UID write', async () => {
    const errors = await validate(plainToInstance(RevokeStudentRfidDto, {}));
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['expectedCardUid', 'expectedStudentVersion']),
    );
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        { rfidCardUid: null },
        { type: 'body', metatype: RevokeStudentRfidDto },
      ),
    ).rejects.toThrow();
  });
  it('retains unresolved confirmation beyond TTL, expires a normal capture slot', () => {
    expect(
      effectiveOpen(
        { state: 'COMMITTING', isOpen: true, expiresAt: new Date(0) } as never,
        1,
      ),
    ).toBe(true);
    expect(
      effectiveOpen(
        { state: 'RECONCILING', isOpen: true, expiresAt: new Date(0) } as never,
        1,
      ),
    ).toBe(true);
    expect(
      effectiveOpen(
        {
          state: 'CARD_CAPTURED',
          isOpen: true,
          expiresAt: new Date(0),
        } as never,
        1,
      ),
    ).toBe(false);
  });
  it('requires time within session and receive deadline, bounds clock skew', () => {
    const timing = {
      startedAt: new Date(1000),
      expiresAt: new Date(4000),
    } as never;
    expect(() => assertCaptureTime(timing, new Date(1000), 2000)).not.toThrow();
    expect(() => assertCaptureTime(timing, new Date(999), 2000)).toThrow();
    expect(() => assertCaptureTime(timing, new Date(3000), 4000)).toThrow();
    expect(() => assertCaptureTime(timing, new Date(4000), 3999)).toThrow();
  });
  it('enforces independent device/student slots and no TTL deletion', () => {
    const indexes = EnrollmentSessionSchema.indexes();
    for (const field of ['deviceId', 'studentId'])
      expect(indexes).toContainEqual([
        { [field]: 1 },
        { unique: true, partialFilterExpression: { isOpen: true } },
      ]);
    expect(
      indexes.some(([, options]) => options.expireAfterSeconds !== undefined),
    ).toBe(false);
    expect(indexes).toContainEqual([
      { capturedScanId: 1 },
      {
        unique: true,
        partialFilterExpression: { capturedScanId: { $type: 'string' } },
      },
    ]);
  });
  it('does not allow admin to supply UID or target in confirmation', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        { cardUid: '00000000', studentId: '_' },
        { type: 'body', metatype: ConfirmEnrollmentDto },
      ),
    ).rejects.toThrow();
  });
  it('requires real device event identifiers and distinguishes false query from true', async () => {
    expect(
      (await validate(plainToInstance(EnrollmentScanDto, {}))).map(
        (e) => e.property,
      ),
    ).toContain('scanId');
    expect(
      plainToInstance(EnrollmentQueryDto, { activeOnly: 'false' }).activeOnly,
    ).toBe(false);
  });
});
