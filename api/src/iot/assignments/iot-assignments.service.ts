import { Optional } from '@nestjs/common';
import { EnrollmentSessionsService } from '../enrollment/enrollment-sessions.service.js';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { frozenTripWhere } from '../../overview/operations-policy.js';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import { iotStorageUnavailable } from '../iot-api-errors.js';
import { ListIotQueryDto } from '../dto/iot-request.dto.js';
import {
  AssignIotVehicleDto,
  ReleaseIotVehicleDto,
} from './iot-assignment.dto.js';
import { iotAssignmentError, lockIotDevice } from './iot-assignment-policy.js';

const includeVehicle = {
  vehicle: { select: { id: true, licensePlate: true } },
} as const;
type Assignment = Prisma.VehicleIotAssignmentGetPayload<{
  include: typeof includeVehicle;
}>;
export function assignmentResponse(row: Assignment) {
  return {
    id: row.id,
    deviceId: row.deviceId,
    vehicleId: row.vehicleId,
    licensePlate: row.vehicle.licensePlate,
    assignedAt: row.assignedAt.toISOString(),
    releasedAt: row.releasedAt?.toISOString() ?? null,
    assignedById: row.assignedById,
    releasedById: row.releasedById,
    reason: row.reason,
    releaseReason: row.releaseReason,
  };
}
export function assignmentState(device: IotDevice, row: Assignment | null) {
  const confirmed =
    (device.reportedAssignmentId ?? null) === (row?.id ?? null) &&
    !!device.lastConfigAckAt &&
    Date.now() - device.lastConfigAckAt.getTime() <= 60000;
  return {
    deviceId: device.deviceId,
    assignment: row ? assignmentResponse(row) : null,
    configurationStatus: confirmed
      ? 'CONFIRMED'
      : !row && !device.reportedAssignmentId
        ? 'UNASSIGNED'
        : 'PENDING',
    reportedAssignmentId: device.reportedAssignmentId ?? null,
    lastConfigAckAt: device.lastConfigAckAt?.toISOString() ?? null,
  };
}
@Injectable()
export class IotAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel('IotDevice', IOT_CONNECTION)
    private readonly devices: Model<IotDevice>,
    @Optional() private readonly enrollments?: EnrollmentSessionsService,
  ) {}

  async registered(deviceId: string) {
    let device: IotDevice | null;
    try {
      device = await this.devices.findOne({ deviceId }).lean().exec();
    } catch {
      iotStorageUnavailable();
    }
    if (!device) throw new NotFoundException('Thiết bị chưa đăng ký');
    return device;
  }
  async current(deviceId: string) {
    const device = await this.registered(deviceId);
    try {
      const row = await this.prisma.vehicleIotAssignment.findFirst({
        where: { deviceId, releasedAt: null },
        include: includeVehicle,
      });
      return assignmentState(device, row);
    } catch (error) {
      iotAssignmentError(error);
    }
  }
  async states(devices: IotDevice[]) {
    if (!devices.length) return [];
    try {
      const rows = await this.prisma.vehicleIotAssignment.findMany({
        where: {
          deviceId: { in: devices.map((d) => d.deviceId) },
          releasedAt: null,
        },
        include: includeVehicle,
      });
      const busy = this.enrollments ? await this.enrollments.metadata(devices.map(d => d.deviceId), this.prisma) : new Map();
      const byDevice = new Map(rows.map((row) => [row.deviceId, row]));
      return devices.map((device) =>
        ({...assignmentState(device, byDevice.get(device.deviceId) ?? null),...(busy.get(device.deviceId)??{enrollmentBusy:false})}),
      );
    } catch (error) {
      iotAssignmentError(error);
    }
  }
  async history(deviceId: string, query: ListIotQueryDto) {
    await this.registered(deviceId);
    try {
      const where = { deviceId };
      const [rows, total] = await Promise.all([
        this.prisma.vehicleIotAssignment.findMany({
          where,
          include: includeVehicle,
          orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.vehicleIotAssignment.count({ where }),
      ]);
      return {
        data: rows.map(assignmentResponse),
        total,
        page: query.page,
        limit: query.limit,
      };
    } catch (error) {
      iotAssignmentError(error);
    }
  }
  async change(
    deviceId: string,
    userId: string,
    dto: AssignIotVehicleDto | ReleaseIotVehicleDto,
  ) {
    const device = await this.registered(deviceId);
    const target = 'vehicleId' in dto ? dto.vehicleId : null;
    try {
      const row = await this.prisma.$transaction(
        async (tx) => {
          await lockIotDevice(tx, deviceId);
          if (target) await this.enrollments?.assertFree(tx, deviceId);
          // Freeze signals live in Trip and TripAttendance; serialize their normal writes.
          // Short admin transaction only; no network/Mongo operation while holding this lock.
          await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
          await tx.$executeRaw`LOCK TABLE "trips", "trip_attendances" IN SHARE ROW EXCLUSIVE MODE`;
          const current = await tx.vehicleIotAssignment.findFirst({
            where: { deviceId, releasedAt: null },
            include: includeVehicle,
          });
          if ((current?.id ?? null) !== dto.expectedAssignmentId)
            throw new ConflictException(
              'Lần gán đã thay đổi. Tải lại danh sách.',
            );
          const ids = [
            ...new Set(
              [current?.vehicleId, target].filter((id): id is string => !!id),
            ),
          ].sort();
          if (ids.length)
            await tx.$queryRaw(
              Prisma.sql`SELECT id FROM vehicles WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
            );
          if (target) {
            const vehicle = await tx.vehicle.findUnique({
              where: { id: target },
            });
            if (!vehicle) throw new NotFoundException('Không tìm thấy xe');
            if (!vehicle.isActive)
              throw new ConflictException('Xe đích đang ngừng hoạt động');
            if (current?.vehicleId === target) return current;
            const occupied = await tx.vehicleIotAssignment.findFirst({
              where: { vehicleId: target, releasedAt: null },
            });
            if (occupied)
              throw new ConflictException('Xe đích đã có thiết bị IoT');
          }
          if (
            ids.length &&
            (await tx.trip.findFirst({
              where: {
                AND: [
                  {
                    assignedVehicleId: { in: ids },
                    status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
                  },
                  frozenTripWhere,
                ],
              },
              select: { id: true },
            }))
          )
            throw new ConflictException(
              'Xe có chuyến đang vận hành hoặc đã đóng băng',
            );
          const [{ now }] = await tx.$queryRaw<
            { now: Date }[]
          >`SELECT clock_timestamp() AS now`;
          if (current)
            await tx.vehicleIotAssignment.update({
              where: { id: current.id },
              data: {
                releasedAt: now,
                releasedById: userId,
                releaseReason: dto.reason ?? null,
              },
            });
          if (!target) return null;
          return tx.vehicleIotAssignment.create({
            data: {
              deviceId,
              vehicleId: target,
              assignedAt: now,
              assignedById: userId,
              reason: dto.reason ?? null,
            },
            include: includeVehicle,
          });
        },
        { maxWait: 5000, timeout: 10000 },
      );
      return assignmentState(device, row);
    } catch (error) {
      iotAssignmentError(error);
    }
  }
}
