import {
  AttendanceContextService,
  type AttendanceContext,
} from '../attendance/attendance-context.service.js';
import { Optional, ServiceUnavailableException } from '@nestjs/common';
import { EnrollmentSessionsService } from '../enrollment/enrollment-sessions.service.js';
import {
  needsLegacyEnrollmentLease,
  pending,
  supportsAssignedEnrollment,
} from '../enrollment/enrollment-policy.js';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import { IotAssignmentsService } from './iot-assignments.service.js';
import { IotHeartbeatDto } from './iot-assignment.dto.js';
import { iotAssignmentError, lockIotDevice } from './iot-assignment-policy.js';
@Injectable()
export class IotRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignments: IotAssignmentsService,
    @InjectModel('IotDevice', IOT_CONNECTION)
    private readonly devices: Model<IotDevice>,
    @Optional() private readonly enrollments?: EnrollmentSessionsService,
    @Optional() private readonly attendance?: AttendanceContextService,
  ) {}
  async config(deviceId: string) {
    const device = await this.assignments.registered(deviceId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockIotDevice(tx, deviceId, true);
        const row = await tx.vehicleIotAssignment.findFirst({
          where: { deviceId, releasedAt: null },
          include: { vehicle: { select: { licensePlate: true } } },
        });
        const session = await this.enrollments?.runtimeSlot(
          tx,
          deviceId,
          row?.vehicleId,
        );
        if (session && pending(session))
          throw new ServiceUnavailableException({
            code: 'MODE_CONFLICT',
            message: 'Thiết bị đang chờ đối soát',
          });
        const legacyEnrollment =
          !!session && needsLegacyEnrollmentLease(device.firmwareVersion);
        const supportsAttendance = supportsAssignedEnrollment(
          device.firmwareVersion,
        );
        const resolved =
          !session && row && supportsAttendance && this.attendance
            ? await this.attendance.resolve(tx, deviceId, row.id, row.vehicleId)
            : null;
        const context = resolved?.context;
        const expiresAtEpoch = Math.floor(
          Math.min(
            Date.now() + 60000,
            session?.expiresAt.getTime() ?? Infinity,
            context ? context.expiresAt * 1000 : Infinity,
          ) / 1000,
        );
        return {
          deviceId,
          mode: session
            ? 'ENROLLMENT'
            : context
              ? 'ATTENDANCE'
              : row
                ? 'VEHICLE_SCAN'
                : 'POC',
          enrollmentSessionId: session?._id ?? null,
          tripId: context?.tripId ?? null,
          phase: context?.phase ?? null,
          contextToken: resolved?.contextToken ?? null,
          contextExpiresAt: context
            ? new Date(context.expiresAt * 1000).toISOString()
            : null,
          attendanceReason:
            resolved?.reason ??
            (row && !supportsAttendance ? 'FIRMWARE_UPGRADE_REQUIRED' : null),
          // 1.4.x parses an enrollment lease only without vehicle fields. The
          // real assignment remains in PostgreSQL and still governs all writes.
          assignmentId: legacyEnrollment ? null : row?.id ?? null,
          vehicleId: legacyEnrollment ? null : row?.vehicleId ?? null,
          licensePlate: legacyEnrollment ? null : row?.vehicle.licensePlate ?? null,
          expiresAt: new Date(expiresAtEpoch * 1000).toISOString(),
          expiresAtEpoch,
        };
      });
    } catch (e) {
      iotAssignmentError(e);
    }
  }

  async heartbeat(deviceId: string, dto: IotHeartbeatDto) {
    const device = await this.assignments.registered(deviceId);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockIotDevice(tx, deviceId);
          const current = await tx.vehicleIotAssignment.findFirst({
            where: { deviceId: deviceId, releasedAt: null },
            select: { id: true, vehicleId: true },
          });
          const enrollment = await this.enrollments?.runtimeSlot(
            tx,
            deviceId,
            current?.vehicleId,
            true,
          );
          if (enrollment) {
            if (
              pending(enrollment) ||
              dto.mode !== 'ENROLLMENT' ||
              dto.enrollmentSessionId !== enrollment._id
            )
              throw new ConflictException({
                code: 'STALE_SESSION',
                message: 'Cần tải lại phiên đăng ký',
              });
          } else if (dto.enrollmentSessionId || dto.mode === 'ENROLLMENT')
            throw new ConflictException('Phiên đăng ký đã kết thúc');
          const assignmentId =
            enrollment && needsLegacyEnrollmentLease(device.firmwareVersion)
              ? null
              : (current?.id ?? null);
          if (assignmentId !== dto.assignmentId)
            throw new ConflictException({
              code: 'STALE_ASSIGNMENT',
              message: 'Cần tải lại cấu hình xe',
            });
          let attendanceContext: AttendanceContext | undefined;
          if (dto.mode === 'ATTENDANCE') {
            if (!this.attendance || !dto.contextToken || enrollment)
              throw new ConflictException('Cần tải lại cấu hình điểm danh');
            attendanceContext = this.attendance.decode(
              dto.contextToken,
              deviceId,
            );
            await this.attendance.assertCurrent(tx, attendanceContext);
          } else if (dto.contextToken)
            throw new ConflictException('Context sai chế độ');
          const now = new Date();
          if (enrollment)
            await this.enrollments!.cas(enrollment, { lastDeviceAckAt: now });
          const updated = await this.devices
            .updateOne(
              { deviceId },
              {
                $set: {
                  reportedAttendanceTripId: attendanceContext?.tripId ?? null,
                  reportedAttendancePhase: attendanceContext?.phase ?? null,
                  reportedAttendanceVersion: attendanceContext?.version ?? null,
                  lastAttendanceAckAt: attendanceContext ? now : null,
                  ...(enrollment
                    ? {}
                    : {
                        reportedAssignmentId: dto.assignmentId,
                        lastConfigAckAt: now,
                      }),
                  ...(dto.firmwareVersion
                    ? { firmwareVersion: dto.firmwareVersion }
                    : {}),
                },
                $max: { lastSeenAt: now },
              },
            )
            .exec();
          if (!updated.matchedCount)
            throw new ConflictException('Thiết bị đã thay đổi');
          return {
            assignmentId: dto.assignmentId,
            enrollmentSessionId: enrollment?._id ?? null,
            mode: enrollment
              ? 'ENROLLMENT'
              : dto.mode === 'ATTENDANCE'
                ? 'ATTENDANCE'
                : current
                  ? 'VEHICLE_SCAN'
                  : 'POC',
            acknowledgedAt: now.toISOString(),
          };
        },
        { maxWait: 5000, timeout: 10000 },
      );
    } catch (error) {
      iotAssignmentError(error);
    }
  }
}
