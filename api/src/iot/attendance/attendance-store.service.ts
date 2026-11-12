import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotRfidScan } from '../database/schemas/rfid-scan.schema.js';
import { attendanceError } from './attendance-policy.js';
export const isAttendancePending = (s: IotRfidScan) =>
  s.processingState === 'COMMITTING' || s.processingState === 'RECONCILING';
@Injectable()
export class AttendanceStore {
  constructor(
    @InjectModel('IotRfidScan', IOT_CONNECTION)
    private readonly scans: Model<IotRfidScan>,
  ) {}
  async io<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Attendance store timeout')),
            2500,
          );
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException({
        code: 'ATTENDANCE_STORE_UNAVAILABLE',
        message: 'Kho lượt quẹt chưa sẵn sàng. Kiểm tra lại kết quả.',
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async existing(scanId: string) {
    return this.io(() =>
      this.scans.findOne({ scanId }).maxTimeMS(1500).lean().exec(),
    );
  }
  async get(scanId: string) {
    const s = await this.existing(scanId);
    if (!s || s.purpose !== 'ATTENDANCE')
      throw new NotFoundException('Không tìm thấy lượt điểm danh RFID.');
    return s;
  }
  async create(data: Partial<IotRfidScan>) {
    // The scanId advisory lock serializes all raw/enrollment/attendance consumers.
    return this.io(async () => (await this.scans.create(data)).toObject());
  }
  async cas(s: IotRfidScan, set: Partial<IotRfidScan>) {
    const next = await this.io(() =>
      this.scans
        .findOneAndUpdate(
          {
            scanId: s.scanId,
            purpose: 'ATTENDANCE',
            processingVersion: s.processingVersion,
            processingState: s.processingState,
          },
          { $set: set, $inc: { processingVersion: 1 } },
          { new: true, runValidators: true, maxTimeMS: 1500 },
        )
        .lean()
        .exec(),
    );
    if (!next)
      attendanceError('STALE_CANDIDATE', 'Lượt quẹt vừa thay đổi. Tải lại.');
    return next;
  }
  async list(
    tripId: string,
    view: 'queue' | 'history',
    page: number,
    limit: number,
  ) {
    const filter = {
      purpose: 'ATTENDANCE' as const,
      tripId,
      ...(view === 'queue'
        ? {
            $or: [
              {
                processingState: {
                  $in: ['COMMITTING', 'RECONCILING'] as const,
                },
              },
              {
                processingState: {
                  $in: [
                    'WAITING_CONFIRMATION',
                    'REJECTED',
                    'ALREADY_RECORDED',
                  ] as const,
                },
                expiresAt: { $gt: new Date() },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.io(() =>
        this.scans
          .find(filter)
          .sort({ createdAt: -1, scanId: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .maxTimeMS(1500)
          .lean()
          .exec(),
      ),
      this.io(() => this.scans.countDocuments(filter).maxTimeMS(1500).exec()),
    ]);
    return { data, total };
  }
  response(s: IotRfidScan, current = false) {
    const expired =
      !isAttendancePending(s) &&
      s.processingState === 'WAITING_CONFIRMATION' &&
      s.expiresAt!.getTime() <= Date.now();
    return {
      scanId: s.scanId,
      deviceId: s.deviceId,
      tripId: s.tripId!,
      studentId: s.studentId ?? null,
      studentName: s.studentNameSnapshot ?? null,
      studentCode: s.studentCodeSnapshot ?? null,
      cardUid: s.cardUid,
      phase: s.phase!,
      state: expired ? 'EXPIRED' : s.processingState!,
      resultCode: s.resultCode ?? null,
      scannedAt: s.scannedAt.toISOString(),
      expiresAt: s.expiresAt!.toISOString(),
      serverTime: new Date().toISOString(),
      confirmedById: s.confirmedById ?? null,
      confirmedAt: s.confirmedAt?.toISOString() ?? null,
      current,
      historical:
        s.processingState === 'APPLIED' ||
        s.processingState === 'ALREADY_RECORDED',
    };
  }
  ack(s: IotRfidScan, duplicate: boolean) {
    return {
      scanId: s.scanId,
      cardUid: s.cardUid,
      scannedAt: s.scannedAt.toISOString(),
      tripId: s.tripId!,
      phase: s.phase!,
      state: s.processingState!,
      resultCode: s.resultCode ?? null,
      duplicate,
    };
  }
}
