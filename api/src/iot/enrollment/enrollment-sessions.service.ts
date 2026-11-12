import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Prisma } from '@prisma/client';
import { IOT_CONNECTION } from '../iot.constants.js';
import { isDuplicateKey } from '../iot-api-errors.js';
import type {
  EnrollmentSession,
  EnrollmentState,
} from './enrollment-session.schema.js';
import {
  effectiveOpen,
  enrollmentError,
  pending,
} from './enrollment-policy.js';
@Injectable()
export class EnrollmentSessionsService {
  constructor(
    @InjectModel('RfidEnrollmentSession', IOT_CONNECTION)
    private readonly sessions: Model<EnrollmentSession>,
  ) {}
  async io<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Bound the HTTP wait, including network stalls. A timed-out write may
      // still finish in MongoDB; callers retain the intent for reconciliation.
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Enrollment store timeout')),
            2500,
          );
        }),
      ]);
    } catch (e) {
      if (isDuplicateKey(e))
        enrollmentError(
          'ENROLLMENT_BUSY',
          'Thiết bị, học sinh hoặc lượt quẹt đang được sử dụng',
        );
      throw new ServiceUnavailableException('Kho phiên đăng ký chưa sẵn sàng');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async get(id: string) {
    const s = await this.io(() =>
      this.sessions.findById(id).maxTimeMS(1500).lean().exec(),
    );
    if (!s) throw new NotFoundException('Không tìm thấy phiên đăng ký');
    return s;
  }
  async list(studentId: string, userId: string, activeOnly: boolean) {
    return this.io(() =>
      this.sessions
        .find({
          studentId,
          createdById: userId,
          ...(activeOnly ? { isOpen: true } : {}),
        })
        .sort({ startedAt: -1 })
        .limit(20)
        .maxTimeMS(1500)
        .lean()
        .exec(),
    );
  }
  async studentSlot(studentId: string) {
    return this.io(() =>
      this.sessions
        .findOne({ studentId, isOpen: true })
        .maxTimeMS(1500)
        .lean()
        .exec(),
    );
  }
  async assertScanUnused(scanId:string) {
    if(await this.io(()=>this.sessions.exists({capturedScanId:scanId}).maxTimeMS(1500).exec()))
      enrollmentError('SCAN_PURPOSE_CONFLICT','Mã lượt quẹt đã được dùng để đăng ký thẻ.');
  }
  async create(data: Partial<EnrollmentSession>) {
    return this.io(async () => (await this.sessions.create(data)).toObject());
  }
  async cas(s: EnrollmentSession, set: Partial<EnrollmentSession>) {
    const next = await this.io(() =>
      this.sessions
        .findOneAndUpdate(
          { _id: s._id, state: s.state, version: s.version },
          { $set: set, $inc: { version: 1 } },
          { new: true, runValidators: true, maxTimeMS: 1500 },
        )
        .lean()
        .exec(),
    );
    if (!next) enrollmentError('STALE_SESSION', 'Phiên vừa thay đổi. Tải lại.');
    return next;
  }
  async close(
    s: EnrollmentSession,
    state: EnrollmentState,
    reason: string = state,
  ) {
    return this.cas(s, {
      state,
      isOpen: false,
      closedAt: new Date(),
      closeReason: reason,
    });
  }
  async feedback(s: EnrollmentSession, scanId: string, code: string) {
    await this.io(() =>
      this.sessions
        .updateOne(
          { _id: s._id },
          {
            $set: {
              lastScanFeedback: { scanId, code, observedAt: new Date() },
            },
          },
          { maxTimeMS: 1500 },
        )
        .exec(),
    );
  }
  async slot(tx: Prisma.TransactionClient, deviceId: string, cleanup = false) {
    let s = await this.io(() =>
      this.sessions
        .findOne({ deviceId, isOpen: true })
        .maxTimeMS(1500)
        .lean()
        .exec(),
    );
    if (!s) return null;
    if (!pending(s)) {
      const student = await tx.student.findUnique({
        where: { id: s.studentId },
        select: { status: true, updatedAt: true },
      });
      const stale =
        !student ||
        student.status !== 'AVAILABLE' ||
        student.updatedAt.toISOString() !== s.studentVersion;
      if (stale || !effectiveOpen(s)) {
        if (cleanup) await this.close(s, stale ? 'INVALIDATED' : 'EXPIRED');
        return null;
      }
    }
    return s;
  }
  async assertFree(tx: Prisma.TransactionClient, deviceId: string) {
    if (await this.slot(tx, deviceId, true))
      enrollmentError(
        'DEVICE_ENROLLMENT_ACTIVE',
        'Thiết bị đang đăng ký thẻ hoặc chờ đối soát',
      );
  }
  async metadata(deviceIds: string[], tx: Prisma.TransactionClient) {
    const rows = await this.io(() =>
      this.sessions
        .find({ deviceId: { $in: deviceIds }, isOpen: true })
        .maxTimeMS(1500)
        .lean()
        .exec(),
    );
    const students = await tx.student.findMany({
      where: { id: { in: rows.map((s) => s.studentId) } },
      select: { id: true, status: true, updatedAt: true },
    });
    const versions = new Map(students.map((s) => [s.id, s]));
    return new Map(
      rows
        .filter((s) => {
          const student = versions.get(s.studentId);
          return (
            effectiveOpen(s) &&
            (pending(s) ||
              (student?.status === 'AVAILABLE' &&
                student.updatedAt.toISOString() === s.studentVersion))
          );
        })
        .map((s) => [
          s.deviceId,
          {
            enrollmentBusy: true,
            enrollmentState: s.state,
            enrollmentExpiresAt: s.expiresAt.toISOString(),
            pendingSessionId: s._id,
          },
        ]),
    );
  }
  // Caller holds Student row lock. Late updates cannot invalidate a session of the new lifecycle version.
  async invalidateStudent(studentId: string, nextVersion: string) {
    await this.io(() =>
      this.sessions
        .updateMany(
          { studentId, isOpen: true, studentVersion: { $ne: nextVersion } },
          {
            $set: {
              isOpen: false,
              state: 'INVALIDATED',
              closedAt: new Date(),
              closeReason: 'STUDENT_STATUS_CHANGED',
            },
            $inc: { version: 1 },
          },
          { maxTimeMS: 1500 },
        )
        .exec(),
    );
  }
  response(s: EnrollmentSession, bindingCurrent = false) {
    return {
      id: s._id,
      operation: s.operation ?? 'REGISTER',
      expectedPreviousCardUid: s.expectedPreviousCardUid ?? null,
      deviceId: s.deviceId,
      studentId: s.studentId,
      state: !effectiveOpen(s) && s.isOpen && !pending(s) ? 'EXPIRED' : s.state,
      isOpen: effectiveOpen(s),
      expiresAt: s.expiresAt.toISOString(),
      serverTime: new Date().toISOString(),
      lastDeviceAckAt: s.lastDeviceAckAt?.toISOString() ?? null,
      candidate: s.capturedScanId
        ? {
            scanId: s.capturedScanId,
            cardUid: s.capturedCardUid,
            cardType: s.capturedCardType,
            scannedAt: s.capturedScannedAt?.toISOString(),
            capturedAt: s.capturedAt?.toISOString(),
          }
        : null,
      lastScanFeedback: s.lastScanFeedback
        ? {
            ...s.lastScanFeedback,
            observedAt: s.lastScanFeedback.observedAt.toISOString(),
          }
        : null,
      closedAt: s.closedAt?.toISOString() ?? null,
      closeReason: s.closeReason ?? null,
      bindingCurrent,
    };
  }
}
