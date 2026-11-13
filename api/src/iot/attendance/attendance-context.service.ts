import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, Trip } from '@prisma/client';
import { IotSecretsService } from '../security/iot-secrets.service.js';
import { tripBlockReason } from '../../schools/school-policy.js';
import {
  vietnamToday,
  contractDate,
} from '../../schools/school-effective-state.js';
import { effectiveTripTiming } from '../../schools/trip-schedule-view.js';
import {
  attendancePhase,
  contextVersion,
  attendanceError,
  type AttendancePhase,
} from './attendance-policy.js';
export interface AttendanceContext {
  v: 1;
  deviceId: string;
  assignmentId: string;
  tripId: string;
  phase: AttendancePhase;
  version: string;
  attendantId: string;
  issuedAt: number;
  expiresAt: number;
}
@Injectable()
export class AttendanceContextService {
  constructor(
    private readonly secrets: IotSecretsService,
    private readonly config: ConfigService,
  ) {}
  encode(context: AttendanceContext) {
    const payload = Buffer.from(JSON.stringify(context)).toString('base64url');
    return payload + '.' + this.secrets.attendanceSignature(payload);
  }
  decode(
    token: string,
    deviceId: string,
    now = Math.floor(Date.now() / 1000),
  ): AttendanceContext {
    const [payload, signature, ...rest] = token.split('.');
    if (
      rest.length ||
      !payload ||
      !signature ||
      token.length > 1024 ||
      !this.secrets.verifyAttendanceSignature(payload, signature)
    )
      attendanceError('INVALID_CONTEXT', 'Cấu hình điểm danh không hợp lệ.');
    let c: AttendanceContext;
    try {
      c = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as AttendanceContext;
    } catch {
      attendanceError('INVALID_CONTEXT', 'Cấu hình điểm danh không hợp lệ.');
    }
    if (
      !c ||
      typeof c !== 'object' ||
      c.v !== 1 ||
      c.deviceId !== deviceId ||
      !c.assignmentId ||
      !c.tripId ||
      !c.attendantId ||
      !['BOARDING', 'ALIGHTING'].includes(c.phase) ||
      !/^\w{64}$/.test(c.version) ||
      !Number.isInteger(c.issuedAt) ||
      !Number.isInteger(c.expiresAt) ||
      c.issuedAt > now + 5 ||
      c.expiresAt <= now ||
      c.expiresAt - c.issuedAt > 60 ||
      c.expiresAt <= c.issuedAt
    )
      attendanceError(
        'STALE_CONTEXT',
        'Cấu hình điểm danh đã hết hạn hoặc thay đổi.',
      );
    return c;
  }
  async eligible(tx: Prisma.TransactionClient, t: Trip) {
    const phase = attendancePhase(t);
    if (!phase || contractDate(t.serviceDate) !== vietnamToday()) return false;
    if (await tripBlockReason(tx, t.id)) return false;
    if (
      !(await tx.tripAttendance.count({
        where: { tripId: t.id, excludedAt: null },
      }))
    )
      return false;
    const attendant = await tx.user.findUnique({
      where: { id: t.assignedBusAttendantId },
      select: { isActive: true, role: true, schoolId: true },
    });
    if (
      !attendant?.isActive ||
      attendant.role !== 'BUS_ATTENDANT' ||
      attendant.schoolId !== t.schoolId
    )
      return false;
    if (
      t.status === 'SCHEDULED' &&
      this.config.get<string>('TRIP_OPERATION_MODE') !== 'TEST'
    ) {
      const timing = await effectiveTripTiming(tx, t.id);
      const start = timing?.scheduledStartAt ?? t.scheduledStartAt,
        end = timing?.scheduledEndAt ?? t.scheduledEndAt;
      if (
        !start ||
        !end ||
        Date.now() < start.getTime() - 15 * 60000 ||
        Date.now() > end.getTime()
      )
        return false;
    }
    return true;
  }
  async resolve(
    tx: Prisma.TransactionClient,
    deviceId: string,
    assignmentId: string,
    vehicleId: string,
  ) {
    const vehicle = await tx.vehicle.findUnique({
      where: { id: vehicleId },
      select: { isActive: true },
    });
    if (!vehicle?.isActive)
      return { reason: 'NO_ACTIVE_TRIP' as const, context: null };
    const trips = await tx.trip.findMany({
      where: {
        assignedVehicleId: vehicleId,
        serviceDate: new Date(vietnamToday()),
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      take: 21,
    });
    if (trips.length > 20)
      return { reason: 'AMBIGUOUS_TRIP' as const, context: null };
    const eligible: Trip[] = [];
    for (const trip of trips)
      if (await this.eligible(tx, trip)) eligible.push(trip);
    if (eligible.length !== 1)
      return {
        reason: eligible.length
          ? ('AMBIGUOUS_TRIP' as const)
          : ('NO_ACTIVE_TRIP' as const),
        context: null,
      };
    const t = eligible[0],
      now = Math.floor(Date.now() / 1000);
    const context: AttendanceContext = {
      v: 1,
      deviceId,
      assignmentId,
      tripId: t.id,
      phase: attendancePhase(t)!,
      version: contextVersion(t),
      attendantId: t.assignedBusAttendantId,
      issuedAt: now,
      expiresAt: now + 60,
    };
    return { reason: null, context, contextToken: this.encode(context) };
  }
  async assertCurrent(tx: Prisma.TransactionClient, c: AttendanceContext) {
    const assignment = await tx.vehicleIotAssignment.findUnique({
      where: { id: c.assignmentId },
    });
    if (
      !assignment ||
      assignment.deviceId !== c.deviceId ||
      assignment.releasedAt
    )
      attendanceError('STALE_ASSIGNMENT', 'Thiết bị đã đổi xe.');
    const resolved = await this.resolve(
      tx,
      c.deviceId,
      c.assignmentId,
      assignment.vehicleId,
    );
    if (
      !resolved.context ||
      resolved.context.tripId !== c.tripId ||
      resolved.context.version !== c.version ||
      resolved.context.phase !== c.phase ||
      resolved.context.attendantId !== c.attendantId
    )
      attendanceError(
        'STALE_CONTEXT',
        'Chuyến hoặc giai đoạn đã thay đổi. Quẹt lại hoặc dùng thủ công.',
      );
  }
}
