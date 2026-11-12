import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import {
  lockIotDevice,
  lockIotScan,
  iotAssignmentError,
} from '../assignments/iot-assignment-policy.js';
import { EnrollmentSessionsService } from './enrollment-sessions.service.js';
import type { EnrollmentSession } from './enrollment-session.schema.js';
import {
  StartEnrollmentDto,
  EnrollmentScanDto,
  RevokeStudentRfidDto,
} from './enrollment.dto.js';
import {
  assertCaptureTime,
  enrollmentError,
  pending,
  requireLive,
  sameCapture,
  bindingMatchesSession,
  requireDifferentCard,
  effectiveOpen,
} from './enrollment-policy.js';
@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: EnrollmentSessionsService,
    @InjectModel('IotDevice', IOT_CONNECTION)
    private readonly devices: Model<IotDevice>,
    @InjectModel('IotRfidScan', IOT_CONNECTION) private readonly rawScans: Model<import('../database/schemas/rfid-scan.schema.js').IotRfidScan>,
  ) {}
  private async registered(id: string) {
    const d = await this.sessions.io(() =>
      this.devices.exists({ deviceId: id }).exec(),
    );
    if (!d) throw new NotFoundException('Thiết bị chưa đăng ký');
  }
  private owner(s: EnrollmentSession, id: string) {
    if (s.createdById !== id)
      throw new ForbiddenException('Chỉ người mở phiên được thao tác');
  }
  private async lockStudent(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM students WHERE id=${id} FOR UPDATE`;
    const s = await tx.student.findUnique({
      where: { id },
      include: { school: { select: { isActive: true } } },
    });
    if (!s) throw new NotFoundException('Không tìm thấy học sinh');
    return s;
  }
  private async eligible(
    tx: Prisma.TransactionClient,
    s: EnrollmentSession,
    student: Awaited<ReturnType<EnrollmentService['lockStudent']>>,
  ) {
    const owner = await tx.user.findUnique({
      where: { id: s.createdById },
      select: { isActive: true, role: true },
    });
    if (!owner?.isActive || owner.role !== Role.SYSTEM_ADMIN)
      enrollmentError(
        'SESSION_OWNER_INACTIVE',
        'Người mở phiên không còn quyền đăng ký',
      );
    if (
      student.status !== 'AVAILABLE' ||
      !student.school.isActive ||
      student.updatedAt.toISOString() !== s.studentVersion
    )
      enrollmentError(
        'STALE_SESSION',
        'Hồ sơ học sinh đã thay đổi. Hủy và mở phiên mới.',
      );
    if (!bindingMatchesSession(s, student.rfidCardUid))
      enrollmentError(
        'STALE_SESSION',
        'Liên kết thẻ đã thay đổi. Hủy và mở phiên mới.',
      );
  }
  private async unbound(tx: Prisma.TransactionClient, id: string) {
    if (
      await tx.vehicleIotAssignment.findFirst({
        where: { deviceId: id, releasedAt: null },
        select: { id: true },
      })
    )
      enrollmentError(
        'DEVICE_ALREADY_ASSIGNED',
        'Chỉ đăng ký thẻ khi thiết bị chưa gắn xe',
      );
  }
  private async transaction<T>(
    deviceId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
          await lockIotDevice(tx, deviceId);
          return work(tx);
        },
        { timeout: 15000, maxWait: 5000 },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        enrollmentError('CARD_ALREADY_ASSIGNED', 'Thẻ đã được đăng ký');
      iotAssignmentError(e);
    }
  }
  async start(dto: StartEnrollmentDto, userId: string) {
    await this.registered(dto.deviceId);
    return this.transaction(dto.deviceId, async (tx) => {
      const student = await this.lockStudent(tx, dto.studentId);
      if (student.schoolId !== dto.schoolId)
        throw new NotFoundException('Học sinh không thuộc trường này');
      await this.unbound(tx, dto.deviceId);
      const slot = await this.sessions.slot(tx, dto.deviceId, true);
      if (slot) {
        this.owner(slot, userId);
        if (
          slot.studentId !== dto.studentId ||
          pending(slot) ||
          (slot.operation ?? 'REGISTER') !== dto.operation ||
          (slot.expectedPreviousCardUid ?? null) !==
            (dto.expectedPreviousCardUid ?? null) ||
          (dto.operation === 'REPLACE' &&
            slot.studentVersion !== dto.expectedStudentVersion)
        )
          enrollmentError('ENROLLMENT_BUSY', 'Thiết bị đang có phiên khác');
        return { session: this.sessions.response(slot), created: false };
      }
      if (student.status !== 'AVAILABLE' || !student.school.isActive)
        enrollmentError(
          'STUDENT_INACTIVE',
          'Học sinh hoặc trường đang ngừng hoạt động',
        );
      if (dto.operation === 'REPLACE') {
        if (
          !student.rfidCardUid ||
          student.rfidCardUid !== dto.expectedPreviousCardUid ||
          student.updatedAt.toISOString() !== dto.expectedStudentVersion
        )
          enrollmentError(
            'STALE_BINDING',
            'Liên kết thẻ đã thay đổi. Tải lại hồ sơ.',
          );
      } else if (student.rfidCardUid) {
        enrollmentError('STUDENT_ALREADY_HAS_CARD', 'Học sinh đã có thẻ RFID');
      }
      // Under Student row lock, close expired/stale sessions on other devices too.
      const old = await this.sessions.studentSlot(dto.studentId);
      if (old) {
        if (
          !pending(old) &&
          (old.expiresAt.getTime() <= Date.now() ||
            old.studentVersion !== student.updatedAt.toISOString())
        )
          await this.sessions.close(old, 'INVALIDATED');
        else
          enrollmentError(
            'ENROLLMENT_BUSY',
            'Học sinh đang có phiên khác hoặc chờ đối soát',
          );
      }
      const [{ now }] = await tx.$queryRaw<
        { now: Date }[]
      >`SELECT clock_timestamp() AS now`;
      const created = await this.sessions.create({
        deviceId: dto.deviceId,
        studentId: dto.studentId,
        createdById: userId,
        studentVersion: student.updatedAt.toISOString(),
        operation: dto.operation,
        ...(dto.operation === 'REPLACE'
          ? { expectedPreviousCardUid: student.rfidCardUid! }
          : {}),
        startedAt: now,
        expiresAt: new Date(now.getTime() + 300000),
        isOpen: true,
        state: 'WAITING_CARD',
        version: 0,
      });
      return { session: this.sessions.response(created), created: true };
    });
  }
  async get(id: string, userId: string) {
    const s = await this.sessions.get(id);
    this.owner(s, userId);
    const student = await this.prisma.student.findUnique({
      where: { id: s.studentId },
      select: { rfidCardUid: true },
    });
    return this.sessions.response(
      s,
      !!s.capturedCardUid && student?.rfidCardUid === s.capturedCardUid,
    );
  }
  async revoke(studentId: string, dto: RevokeStudentRfidDto) {
    // Student-only lock: never acquire a device lock after this lock.
    return this.prisma
      .$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
          const student = await this.lockStudent(tx, studentId);
          if (student.status !== 'AVAILABLE' || !student.school.isActive)
            enrollmentError(
              'STUDENT_INACTIVE',
              'Học sinh hoặc trường đang ngừng hoạt động',
            );
          const slot = await this.sessions.studentSlot(studentId);
          if (slot && effectiveOpen(slot))
            enrollmentError(
              'ENROLLMENT_BUSY',
              'Hãy xử lý phiên đăng ký hoặc đối soát trước khi hủy liên kết.',
            );
          if (student.rfidCardUid === null) {
            return {
              studentId,
              rfidCardUid: null,
              updatedAt: student.updatedAt.toISOString(),
            };
          }
          if (
            student.rfidCardUid !== dto.expectedCardUid ||
            student.updatedAt.toISOString() !== dto.expectedStudentVersion
          )
            enrollmentError(
              'STALE_BINDING',
              'Liên kết thẻ đã thay đổi. Tải lại hồ sơ.',
            );
          const updated = await tx.student.update({
            where: { id: studentId },
            data: {
              rfidCardUid: null,
              updatedAt: new Date(
                Math.max(Date.now(), student.updatedAt.getTime() + 1),
              ),
            },
          });
          return {
            studentId,
            rfidCardUid: null,
            updatedAt: updated.updatedAt.toISOString(),
          };
        },
        { timeout: 10000, maxWait: 5000 },
      )
      .catch((error: unknown) => {
        if (error instanceof HttpException) throw error;
        throw new ServiceUnavailableException(
          'Chưa hủy được liên kết thẻ. Tải lại hồ sơ để kiểm tra.',
        );
      });
  }
  async list(studentId: string, userId: string, activeOnly: boolean) {
    const rows = await this.sessions.list(studentId, userId, activeOnly);
    return {
      data: await Promise.all(rows.map((s) => this.get(s._id, userId))),
    };
  }
  async cancel(id: string, userId: string) {
    const initial = await this.sessions.get(id);
    this.owner(initial, userId);
    return this.transaction(initial.deviceId, async (tx) => {
      await this.lockStudent(tx, initial.studentId);
      const s = await this.sessions.get(id);
      this.owner(s, userId);
      if (s.state === 'CANCELLED') return this.sessions.response(s);
      if (pending(s) || s.state === 'COMPLETED')
        enrollmentError(
          'CONFIRMATION_PENDING',
          'Phiên đang xác nhận hoặc đã hoàn tất; không thể hủy',
        );
      return this.sessions.response(
        s.isOpen ? await this.sessions.close(s, 'CANCELLED') : s,
      );
    });
  }
  async capture(deviceId: string, dto: EnrollmentScanDto) {
    await this.registered(deviceId);
    return this.transaction(deviceId, async (tx) => {
      await lockIotScan(tx,dto.scanId);
      if(await this.sessions.io(()=>this.rawScans.exists({scanId:dto.scanId}).maxTimeMS(1500).exec()))
        enrollmentError('SCAN_PURPOSE_CONFLICT','Mã lượt quẹt đã dùng cho mục đích khác.');
      const s = await this.sessions.get(dto.sessionId);
      if (s.deviceId !== deviceId)
        throw new ForbiddenException('Phiên không thuộc thiết bị');
      if (s.capturedScanId === dto.scanId) {
        if (!sameCapture(s, dto))
          enrollmentError('CAPTURE_CONFLICT', 'scanId đã có payload khác');
        if (
          s.state === 'CANCELLED' ||
          s.state === 'EXPIRED' ||
          s.state === 'INVALIDATED' ||
          s.state === 'FAILED'
        )
          requireLive(s);
        return this.captureAck(s, true);
      }
      await this.unbound(tx, deviceId);
      if (pending(s))
        enrollmentError(
          'CONFIRMATION_PENDING',
          'Đang xác nhận đăng ký, vui lòng chờ',
        );
      if (s.state === 'COMPLETED') {
        const used = await tx.student.findUnique({
          where: { rfidCardUid: dto.cardUid },
          select: { id: true },
        });
        await this.sessions.feedback(
          s,
          dto.scanId,
          used ? 'CARD_ALREADY_ASSIGNED' : 'SESSION_COMPLETED',
        );
        enrollmentError(
          used ? 'CARD_ALREADY_ASSIGNED' : 'SESSION_COMPLETED',
          used ? 'Thẻ đã được đăng ký' : 'Phiên đã hoàn tất. Mở phiên mới.',
        );
      }
      requireLive(s);
      assertCaptureTime(s, new Date(dto.scannedAt));
      const student = await this.lockStudent(tx, s.studentId);
      await this.eligible(tx, s, student);
      if (
        !s.lastDeviceAckAt ||
        Date.now() - s.lastDeviceAckAt.getTime() > 60000
      )
        enrollmentError(
          'STALE_SESSION',
          'Thiết bị chưa nhận đúng phiên đăng ký',
        );
      if (student.rfidCardUid === dto.cardUid) {
        await this.sessions.feedback(s, dto.scanId, 'SAME_CARD');
        requireDifferentCard(student.rfidCardUid, dto.cardUid);
      }
      const used = await tx.student.findUnique({
        where: { rfidCardUid: dto.cardUid },
        select: { id: true },
      });
      if (used) {
        await this.sessions.feedback(s, dto.scanId, 'CARD_ALREADY_ASSIGNED');
        enrollmentError('CARD_ALREADY_ASSIGNED', 'Thẻ đã được đăng ký');
      }
      if (s.capturedScanId) {
        const same = s.capturedCardUid === dto.cardUid;
        await this.sessions.feedback(
          s,
          dto.scanId,
          same ? 'CARD_ALREADY_CAPTURED' : 'CAPTURE_CONFLICT',
        );
        enrollmentError(
          same ? 'CARD_ALREADY_CAPTURED' : 'CAPTURE_CONFLICT',
          same
            ? 'Thẻ đã được đọc. Vui lòng xác nhận đăng ký.'
            : 'Phiên đã đọc một thẻ khác. Hủy để chọn lại.',
        );
      }
      const captured = await this.sessions.cas(s, {
        state: 'CARD_CAPTURED',
        capturedScanId: dto.scanId,
        capturedCardUid: dto.cardUid,
        capturedCardType: dto.cardType,
        capturedScannedAt: new Date(dto.scannedAt),
        capturedAt: new Date(),
      });
      return this.captureAck(captured, false);
    });
  }
  private captureAck(s: EnrollmentSession, duplicate: boolean) {
    return {
      sessionId: s._id,
      scanId: s.capturedScanId,
      cardUid: s.capturedCardUid,
      scannedAt: s.capturedScannedAt?.toISOString(),
      state: s.state,
      duplicate,
    };
  }
  async confirm(
    id: string,
    scanId: string,
    userId: string,
    reconcileOnly = false,
  ) {
    const original = await this.sessions.get(id);
    if (!reconcileOnly) this.owner(original, userId);
    let intent: EnrollmentSession | undefined;
    try {
      const result = await this.transaction(original.deviceId, async (tx) => {
        const student = await this.lockStudent(tx, original.studentId);
        const s = await this.sessions.get(id);
        if (!reconcileOnly) this.owner(s, userId);
        if (s.capturedScanId !== scanId || !s.capturedCardUid)
          enrollmentError('CAPTURE_CONFLICT', 'Lượt quẹt không khớp phiên');
        if (s.state === 'COMPLETED')
          return this.sessions.response(
            s,
            student.rfidCardUid === s.capturedCardUid,
          );
        if (pending(s)) {
          const done = await this.sessions.close(
            s,
            student.rfidCardUid === s.capturedCardUid ? 'COMPLETED' : 'FAILED',
            student.rfidCardUid === s.capturedCardUid
              ? 'COMPLETED'
              : 'CURRENT_BINDING_NOT_CONFIRMED',
          );
          return this.sessions.response(
            done,
            student.rfidCardUid === s.capturedCardUid,
          );
        }
        if (reconcileOnly)
          enrollmentError(
            'STALE_SESSION',
            'Chỉ đối soát phiên đang chờ xác nhận',
          );
        requireLive(s);
        await this.unbound(tx, s.deviceId);
        await this.eligible(tx, s, student);
        requireDifferentCard(student.rfidCardUid, s.capturedCardUid);
        if (s.state !== 'CARD_CAPTURED')
          enrollmentError('STALE_SESSION', 'Chưa có thẻ hợp lệ');
        intent = await this.sessions.cas(s, {
          state: 'COMMITTING',
          confirmRequestedAt: new Date(),
        });
        await tx.student.update({
          where: { id: student.id },
          data: {
            rfidCardUid: s.capturedCardUid,
            updatedAt: new Date(
              Math.max(Date.now(), student.updatedAt.getTime() + 1),
            ),
          },
        });
        return null;
      });
      if (result) return { pending: false, session: result };
      const completed = await this.sessions.close(intent!, 'COMPLETED');
      return {
        pending: false,
        session: this.sessions.response(completed, true),
      };
    } catch (e) {
      if (intent && e instanceof HttpException && e.getStatus() === 409) {
        try {
          await this.sessions.close(intent, 'FAILED', 'CARD_ALREADY_ASSIGNED');
        } catch {
          return {
            pending: true,
            session: this.sessions.response({
              ...intent,
              state: 'RECONCILING',
            }),
          };
        }
        throw e;
      }
      if (intent) {
        // A failed/lost PG acknowledgement may still mean the UID committed. Never compensate or re-write on retry.
        return {
          pending: true,
          session: this.sessions.response({ ...intent, state: 'RECONCILING' }),
        };
      }
      if (e instanceof HttpException) throw e;
      throw e;
    }
  }
  async reconcile(id: string, userId: string) {
    const s = await this.sessions.get(id);
    if (!pending(s))
      enrollmentError('STALE_SESSION', 'Chỉ đối soát phiên đang chờ xác nhận');
    const result = await this.confirm(id, s.capturedScanId ?? '', userId, true);
    if (!result.pending) await this.sessionsAudit(id, userId);
    return result;
  }
  private async sessionsAudit(id: string, userId: string) {
    const s = await this.sessions.get(id);
    await this.sessions.cas(s, {
      reconciledAt: new Date(),
      reconciledById: userId,
    });
  }
}
