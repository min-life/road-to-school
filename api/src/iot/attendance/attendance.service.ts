import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { type Prisma, type User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ContractLifecycleService } from '../../schools/contract-lifecycle.service.js';
import {
  lockTripOperation,
  writeAlighting,
  writeBoarding,
} from '../../trips/attendance-operations.js';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import type { IotRfidScan } from '../database/schemas/rfid-scan.schema.js';
import {
  lockIotDevice,
  lockIotScan,
} from '../assignments/iot-assignment-policy.js';
import { EnrollmentSessionsService } from '../enrollment/enrollment-sessions.service.js';
import { AttendanceContextService } from './attendance-context.service.js';
import {
  AttendanceStore,
  isAttendancePending,
} from './attendance-store.service.js';
import { AttendanceScanDto, AttendanceListQueryDto } from './attendance.dto.js';
import {
  attendanceError,
  attendanceAllowed,
  alreadyRecorded,
  candidateLive,
  receiptField,
  attendancePhase,
  contextVersion,
} from './attendance-policy.js';
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: AttendanceStore,
    private readonly contexts: AttendanceContextService,
    private readonly enrollments: EnrollmentSessionsService,
    private readonly lifecycle: ContractLifecycleService,
    @InjectModel('IotDevice', IOT_CONNECTION)
    private readonly devices: Model<IotDevice>,
  ) {}
  private async access(
    tripId: string,
    user: User,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (user.role !== 'BUS_ATTENDANT')
      throw new ForbiddenException('Chỉ phụ xe được phân công được thao tác.');
    const t = await tx.trip.findUnique({ where: { id: tripId } });
    if (!t) throw new NotFoundException('Không tìm thấy chuyến xe.');
    if (t.assignedBusAttendantId !== user.id)
      throw new ForbiddenException('Bạn không được phân công chuyến này.');
    return t;
  }
  private transaction<T>(
    deviceId: string,
    scanId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma
      .$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
          await lockIotDevice(tx, deviceId);
          await lockIotScan(tx, scanId);
          return work(tx);
        },
        { timeout: 20000, maxWait: 5000 },
      )
      .catch((e: unknown) => {
        if (e instanceof HttpException) throw e;
        throw new ServiceUnavailableException({
          code: 'ATTENDANCE_UNAVAILABLE',
          message: 'Điểm danh chưa sẵn sàng. Kiểm tra lại kết quả.',
        });
      });
  }
  private async studentLock(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM students WHERE id=${id} FOR UPDATE`;
    return tx.student.findUnique({
      where: { id },
      include: { school: { select: { isActive: true } } },
    });
  }
  async capture(deviceId: string, dto: AttendanceScanDto) {
    if (
      !(await this.store.io(() =>
        this.devices.exists({ deviceId }).maxTimeMS(1500).exec(),
      ))
    )
      throw new NotFoundException('Thiết bị chưa đăng ký.');
    return this.transaction(deviceId, dto.scanId, async (tx) => {
      const previous = await this.store.existing(dto.scanId);
      if (previous) {
        if (
          previous.purpose !== 'ATTENDANCE' ||
          previous.deviceId !== deviceId ||
          previous.cardUid !== dto.cardUid ||
          previous.contextToken !== dto.contextToken ||
          previous.scannedAt.getTime() !== new Date(dto.scannedAt).getTime() ||
          previous.cardType !== dto.cardType
        )
          attendanceError(
            'SCAN_PURPOSE_CONFLICT',
            'Mã lượt quẹt đã được dùng với dữ liệu hoặc mục đích khác.',
          );
        return this.store.ack(previous, true);
      }
      await this.enrollments.assertScanUnused(dto.scanId);
      if (await this.enrollments.slot(tx, deviceId))
        attendanceError('DEVICE_IN_ENROLLMENT', 'Thiết bị đang đăng ký thẻ.');
      const c = this.contexts.decode(dto.contextToken, deviceId);
      const scannedAt = new Date(dto.scannedAt),
        now = Date.now();
      if (
        scannedAt.getTime() < c.issuedAt * 1000 ||
        scannedAt.getTime() >= c.expiresAt * 1000 ||
        scannedAt.getTime() > now + 5000 ||
        now - scannedAt.getTime() > 60000
      )
        attendanceError(
          'STALE_CONTEXT',
          'Thời gian lượt quẹt không còn hợp lệ.',
        );
      let student = await tx.student.findUnique({
        where: { rfidCardUid: dto.cardUid },
        include: { school: { select: { isActive: true } } },
      });
      if (student) student = await this.studentLock(tx, student.id);
      await lockTripOperation(tx, c.tripId, this.lifecycle, false);
      await this.contexts.assertCurrent(tx, c);
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: c.tripId } });
      const assignment = await tx.vehicleIotAssignment.findUniqueOrThrow({
        where: { id: c.assignmentId },
        include: { vehicle: { select: { licensePlate: true } } },
      });
      let resultCode: string | null = null;
      if (!student || student.rfidCardUid !== dto.cardUid)
        resultCode = 'UNKNOWN_CARD';
      else if (student.status !== 'AVAILABLE' || !student.school.isActive)
        resultCode = 'STUDENT_INACTIVE';
      const row = student
        ? await tx.tripAttendance.findUnique({
            where: {
              tripId_studentId: { tripId: c.tripId, studentId: student.id },
            },
          })
        : null;
      if (
        !resultCode &&
        (!row || row.excludedAt || student!.schoolId !== trip.schoolId)
      )
        resultCode = 'OUTSIDE_ROSTER';
      if (!resultCode && row) {
        try {
          attendanceAllowed(row, c.phase);
        } catch (e) {
          if (e instanceof HttpException)
            resultCode = (e.getResponse() as { code: string }).code;
          else throw e;
        }
      }
      // Do not disclose identity for rejected/outside-roster reads.
      const valid = !resultCode;
      const already = valid && row && alreadyRecorded(row, c.phase);
      const created = await this.store.create({
        scanId: dto.scanId,
        deviceId,
        cardUid: dto.cardUid,
        cardType: dto.cardType,
        scannedAt,
        purpose: 'ATTENDANCE',
        tripId: c.tripId,
        phase: c.phase,
        context: c,
        contextToken: dto.contextToken,
        assignmentId: c.assignmentId,
        vehicleId: trip.assignedVehicleId,
        vehicleLicensePlateSnapshot: assignment.vehicle.licensePlate,
        ...(valid
          ? {
              studentId: student!.id,
              studentVersion: student!.updatedAt.toISOString(),
              studentNameSnapshot: student!.fullName,
              studentCodeSnapshot: student!.code,
            }
          : {}),
        processingState: resultCode
          ? 'REJECTED'
          : already
            ? 'ALREADY_RECORDED'
            : 'WAITING_CONFIRMATION',
        resultCode: resultCode ?? (already ? 'ALREADY_RECORDED' : undefined),
        expiresAt: new Date(now + 120000),
        processingVersion: 0,
        ...(already ? { closedAt: new Date() } : {}),
      });
      return this.store.ack(created, false);
    });
  }
  async list(tripId: string, q: AttendanceListQueryDto, user: User) {
    const trip = await this.access(tripId, user);
    const assignment = await this.prisma.vehicleIotAssignment.findFirst({
      where: { vehicleId: trip.assignedVehicleId, releasedAt: null },
    });
    const device = assignment
      ? await this.store.io(() =>
          this.devices
            .findOne({ deviceId: assignment.deviceId })
            .maxTimeMS(1500)
            .lean()
            .exec(),
        )
      : null;
    const active = await this.contexts.eligible(this.prisma, trip);
    const ready =
      active &&
      !!assignment &&
      device?.reportedAssignmentId === assignment.id &&
      device.reportedAttendanceTripId === tripId &&
      device.reportedAttendancePhase === attendancePhase(trip) &&
      device.reportedAttendanceVersion === contextVersion(trip) &&
      !!device.lastAttendanceAckAt &&
      Date.now() - device.lastAttendanceAckAt.getTime() < 60000;
    const reader = {
      deviceId: assignment?.deviceId ?? null,
      status: !assignment ? 'NO_DEVICE' : ready ? 'READY' : 'PENDING',
      lastAckAt: device?.lastAttendanceAckAt?.toISOString() ?? null,
    };
    const result = await this.store.list(tripId, q.view, q.page, q.limit);
    const ids = result.data.flatMap((s) => (s.studentId ? [s.studentId] : []));
    const rows = await this.prisma.tripAttendance.findMany({
      where: { tripId, studentId: { in: ids } },
    });
    const map = new Map(rows.map((r) => [r.studentId, r]));
    return {
      data: result.data.map((s) => {
        const r = s.studentId ? map.get(s.studentId) : null;
        return this.store.response(
          s,
          !!r &&
            !r.excludedAt &&
            alreadyRecorded(r, s.phase!) &&
            (s.processingState === 'ALREADY_RECORDED' ||
              r[receiptField(s.phase!)] === s.scanId),
        );
      }),
      total: result.total,
      page: q.page,
      limit: q.limit,
      phase: attendancePhase(trip),
      reader,
      serverTime: new Date().toISOString(),
    };
  }
  async dismiss(tripId: string, scanId: string, user: User) {
    await this.access(tripId, user);
    const original = await this.store.get(scanId);
    if (original.tripId !== tripId)
      throw new NotFoundException('Không tìm thấy lượt quẹt trong chuyến.');
    return this.transaction(original.deviceId, scanId, async (tx) => {
      await lockTripOperation(tx, tripId, this.lifecycle, false);
      await this.access(tripId, user, tx);
      const s = await this.store.get(scanId);
      if (s.processingState === 'DISMISSED') return this.store.response(s);
      if (
        isAttendancePending(s) ||
        s.processingState === 'APPLIED' ||
        s.processingState === 'ALREADY_RECORDED'
      )
        attendanceError(
          'CONFIRMATION_PENDING',
          'Không thể bỏ qua lượt đã xác nhận hoặc đang đối soát.',
        );
      return this.store.response(
        await this.store.cas(s, {
          processingState: 'DISMISSED',
          resultCode: 'DISMISSED',
          closedAt: new Date(),
        }),
      );
    });
  }
  async confirm(tripId: string, scanId: string, user: User) {
    await this.access(tripId, user);
    const original = await this.store.get(scanId);
    if (original.tripId !== tripId)
      throw new NotFoundException('Không tìm thấy lượt quẹt trong chuyến.');
    let intent: IotRfidScan | undefined;
    try {
      const result = await this.transaction(
        original.deviceId,
        scanId,
        async (tx) => {
          const student = original.studentId
            ? await this.studentLock(tx, original.studentId)
            : null;
          await lockTripOperation(tx, tripId, this.lifecycle, false);
          await this.access(tripId, user, tx);
          const s = await this.store.get(scanId);
          const row = s.studentId
            ? await tx.tripAttendance.findUnique({
                where: { tripId_studentId: { tripId, studentId: s.studentId } },
              })
            : null;
          const receipt = row?.[receiptField(s.phase!)];
          const current =
            !!row &&
            !row.excludedAt &&
            receipt === scanId &&
            alreadyRecorded(row, s.phase!);
          if (
            s.processingState === 'APPLIED' ||
            s.processingState === 'ALREADY_RECORDED'
          )
            return this.store.response(
              s,
              current ||
                (s.processingState === 'ALREADY_RECORDED' &&
                  !!row &&
                  !row.excludedAt &&
                  alreadyRecorded(row, s.phase!)),
            );
          if (isAttendancePending(s)) {
            // Holding the same PG locks means the original PG writer has finished. Never replay it.
            return this.store.response(
              await this.store.cas(s, {
                processingState: receipt === scanId ? 'APPLIED' : 'REJECTED',
                resultCode:
                  receipt === scanId ? 'APPLIED' : 'RECEIPT_NOT_CONFIRMED',
                closedAt: new Date(),
              }),
              current,
            );
          }
          if (s.processingState !== 'WAITING_CONFIRMATION')
            attendanceError(
              'CANDIDATE_CLOSED',
              'Lượt quẹt không còn chờ xác nhận.',
            );
          candidateLive(s.expiresAt!);
          if (
            !student ||
            student.status !== 'AVAILABLE' ||
            !student.school.isActive ||
            student.rfidCardUid !== s.cardUid ||
            student.updatedAt.toISOString() !== s.studentVersion
          )
            attendanceError(
              'STALE_STUDENT',
              'Thẻ hoặc hồ sơ đã thay đổi. Quẹt lại hoặc dùng thủ công.',
            );
          if (!row || row.excludedAt)
            attendanceError(
              'OUTSIDE_ROSTER',
              'Học sinh không thuộc danh sách đang phục vụ.',
            );
          if (await this.enrollments.slot(tx, s.deviceId))
            attendanceError(
              'DEVICE_IN_ENROLLMENT',
              'Thiết bị đang đăng ký thẻ.',
            );
          await this.contexts.assertCurrent(tx, s.context!);
          attendanceAllowed(row, s.phase!);
          if (alreadyRecorded(row, s.phase!))
            return this.store.response(
              await this.store.cas(s, {
                processingState: 'ALREADY_RECORDED',
                resultCode: 'ALREADY_RECORDED',
                closedAt: new Date(),
              }),
              true,
            );
          if (receipt)
            attendanceError(
              'MANUAL_OVERRIDE',
              'Lượt RFID trước đã ghi nhận. Vui lòng xử lý thủ công.',
            );
          intent = await this.store.cas(s, {
            processingState: 'COMMITTING',
            confirmedById: user.id,
            confirmedAt: new Date(),
          });
          if (s.phase === 'BOARDING')
            await writeBoarding(
              tx,
              tripId,
              s.studentId!,
              { status: 'PRESENT' },
              user,
            );
          else
            await writeAlighting(
              tx,
              tripId,
              s.studentId!,
              { isAlighted: true },
              user,
            );
          await tx.tripAttendance.update({
            where: { id: row.id },
            data: { [receiptField(s.phase!)]: scanId },
          });
          return null;
        },
      );
      if (result) return { pending: false, event: result };
      const applied = await this.store.cas(intent!, {
        processingState: 'APPLIED',
        resultCode: 'APPLIED',
        closedAt: new Date(),
      });
      return { pending: false, event: this.store.response(applied, true) };
    } catch (error) {
      if (intent)
        return {
          pending: true,
          event: this.store.response({
            ...intent,
            processingState: 'RECONCILING',
            resultCode: 'CONFIRMATION_PENDING',
          }),
        };
      throw error;
    }
  }
}
