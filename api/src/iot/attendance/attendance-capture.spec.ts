import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { AttendanceService } from './attendance.service.js';
import type { IotRfidScan } from '../database/schemas/rfid-scan.schema.js';
import { receiptField } from './attendance-policy.js';
import {
  writeAlighting,
  writeBoarding,
} from '../../trips/attendance-operations.js';

vi.mock('../../trips/attendance-operations.js', () => ({
  lockTripOperation: vi.fn(),
  writeBoarding: vi.fn(),
  writeAlighting: vi.fn(),
}));

describe('RFID automatic capture', () => {
  it.each(['BOARDING', 'ALIGHTING'] as const)(
    'writes %s once and recovers a lost acknowledgment',
    async (phase) => {
      vi.clearAllMocks();
      const now = Date.now();
      const dto = {
        scanId: 'scan',
        cardUid: 'AABBCCDD',
        contextToken: 'token',
        scannedAt: new Date(now).toISOString(),
      };
      const context = {
        tripId: 'trip',
        assignmentId: 'assignment',
        attendantId: 'attendant',
        phase,
        issuedAt: Math.floor(now / 1000),
        expiresAt: Math.floor(now / 1000) + 60,
      };
      const student = {
        id: 'student',
        schoolId: 'school',
        school: { isActive: true },
        status: 'AVAILABLE',
        rfidCardUid: dto.cardUid,
        updatedAt: new Date(now),
      };
      const row = {
        id: 'row',
        tripId: 'trip',
        studentId: 'student',
        status: phase === 'BOARDING' ? 'UNMARKED' : 'PRESENT',
      };
      let scan: IotRfidScan | null = null;
      const store = {
        io: (fn: () => unknown) => fn(),
        existing: vi.fn(async () => scan),
        get: vi.fn(async () => scan),
        create: vi.fn(async (data: IotRfidScan) => (scan = data)),
        cas: vi.fn(
          async (record: IotRfidScan, data: Partial<IotRfidScan>) =>
            (scan = { ...record, ...data }),
        ),
        ack: vi.fn((record: IotRfidScan, duplicate: boolean) => ({
          state: record.processingState,
          duplicate,
        })),
      };
      const tx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn(),
        student: { findUnique: vi.fn().mockResolvedValue(student) },
        trip: {
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({
              schoolId: 'school',
              assignedVehicleId: 'vehicle',
            }),
        },
        vehicleIotAssignment: {
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({
              vehicleId: 'vehicle',
              vehicle: { licensePlate: 'test' },
            }),
        },
        tripAttendance: {
          findUnique: vi.fn().mockResolvedValue(row),
          update: vi.fn(async ({ data }) => Object.assign(row, data)),
        },
      };
      const prisma = {
        $transaction: (fn: (client: Prisma.TransactionClient) => unknown) =>
          fn(tx as never),
      };
      const env = new AttendanceService(
        prisma as never,
        store as never,
        { decode: () => context, assertCurrent: vi.fn() } as never,
        {
          assertScanUnused: vi.fn(),
          runtimeSlot: vi.fn().mockResolvedValue(null),
        } as never,
        {} as never,
        {
          exists: () => ({ maxTimeMS: () => ({ exec: () => true }) }),
        } as never,
      );

      store.cas.mockRejectedValueOnce(new Error('Lost Mongo response'));
      await expect(env.capture('device', dto)).rejects.toMatchObject({
        status: 503,
      });
      expect(scan).toMatchObject({ processingState: 'COMMITTING' });
      expect(row).toMatchObject({ [receiptField(phase)]: dto.scanId });
      await expect(env.capture('device', dto)).resolves.toEqual({
        state: 'APPLIED',
        duplicate: true,
      });
      await expect(env.capture('device', dto)).resolves.toEqual({
        state: 'APPLIED',
        duplicate: true,
      });
      expect(store.create).toHaveBeenCalledTimes(1);
      expect(
        phase === 'BOARDING' ? writeBoarding : writeAlighting,
      ).toHaveBeenCalledTimes(1);
      expect(
        phase === 'BOARDING' ? writeAlighting : writeBoarding,
      ).not.toHaveBeenCalled();
    },
  );
});
