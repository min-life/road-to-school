import { Optional } from '@nestjs/common';
import { EnrollmentSessionsService } from '../enrollment/enrollment-sessions.service.js';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IOT_CONNECTION } from '../iot.constants.js';
import type { IotDevice } from '../database/schemas/device.schema.js';
import type { IotRfidScan } from '../database/schemas/rfid-scan.schema.js';
import { ListIotScansQueryDto, ReceiveIotScanDto } from '../dto/iot-request.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { assertAssignmentTime, iotAssignmentError, lockIotDevice, lockIotScan } from '../assignments/iot-assignment-policy.js';
import { IotScansGateway } from '../realtime/iot-scans.gateway.js';
import { isDuplicateKey, iotStorageUnavailable } from '../iot-api-errors.js';

export function scanResponse(scan: IotRfidScan) {
  return {
    scanId: scan.scanId, deviceId: scan.deviceId, cardUid: scan.cardUid,
    assignmentId: scan.assignmentId ?? null, vehicleId: scan.vehicleId ?? null, vehicleLicensePlateSnapshot: scan.vehicleLicensePlateSnapshot ?? null,
    cardType: scan.cardType, scannedAt: scan.scannedAt.toISOString(), createdAt: scan.createdAt.toISOString(),
  };
}

@Injectable()
export class IotScansService {
  constructor(
    @InjectModel('IotDevice', IOT_CONNECTION) private readonly devices: Model<IotDevice>,
    @InjectModel('IotRfidScan', IOT_CONNECTION) private readonly scans: Model<IotRfidScan>,
    private readonly realtime: IotScansGateway,
    private readonly prisma: PrismaService,
    @Optional() private readonly enrollments?: EnrollmentSessionsService,
  ) {}

  async receive(dto: ReceiveIotScanDto) {
    const scannedAt = new Date(dto.scannedAt);
    if (!Number.isFinite(scannedAt.getTime()) || scannedAt.getTime() > Date.now() + 300000) {
      throw new BadRequestException('Thời gian quẹt không hợp lệ hoặc vượt quá 5 phút trong tương lai');
    }
    let device: IotDevice | null;
    try { device = await this.devices.findOne({ deviceId: dto.deviceId }).lean().exec(); }
    catch { iotStorageUnavailable(); }
    if (!device) throw new NotFoundException('Thiết bị chưa đăng ký');
    const previous = await this.existingScan(dto, scannedAt, false);
    if (previous) return { scan: previous.scan, duplicate: true };
    let inserted = false;
    let scan: IotRfidScan;
    try {
      scan = await this.prisma.$transaction(async tx => {
        await lockIotDevice(tx, dto.deviceId, true);
        await lockIotScan(tx,dto.scanId);
        await this.enrollments?.assertScanUnused(dto.scanId);
        if (this.enrollments && await this.enrollments.slot(tx, dto.deviceId)) throw new ConflictException({code:"DEVICE_IN_ENROLLMENT",message:"Thiết bị đang đăng ký thẻ"});
        let snapshot: { assignmentId: string | null; vehicleId: string | null; vehicleLicensePlateSnapshot: string | null } = {
          assignmentId: null, vehicleId: null, vehicleLicensePlateSnapshot: null,
        };
        if (dto.assignmentId) {
          const assignment = await tx.vehicleIotAssignment.findUnique({ where: { id: dto.assignmentId }, include: { vehicle: { select: { licensePlate: true } } } });
          if (!assignment || assignment.deviceId !== dto.deviceId) throw new ConflictException({ code: 'STALE_ASSIGNMENT', message: 'Lần gán xe không thuộc thiết bị' });
          assertAssignmentTime(assignment.assignedAt, assignment.releasedAt, scannedAt);
          snapshot = { assignmentId: assignment.id, vehicleId: assignment.vehicleId, vehicleLicensePlateSnapshot: assignment.vehicle.licensePlate };
        } else if (await tx.vehicleIotAssignment.findFirst({ where: { deviceId: dto.deviceId, releasedAt: null }, select: { id: true } })) {
          throw new ConflictException({ code: 'IOT_ASSIGNMENT_REQUIRED', message: 'Thiết bị đã gán xe, cần firmware/cấu hình hỗ trợ assignmentId' });
        }
        try { const result = await this.scans.create({ ...dto, scannedAt, ...snapshot }); inserted = true; return result; }
        catch (error) {
          if (!isDuplicateKey(error)) iotStorageUnavailable();
          return (await this.existingScan(dto, scannedAt, true))!.scanDocument;
        }
      }, { maxWait: 5000, timeout: 10000 });
    } catch (error) { iotAssignmentError(error); }
    const response = scanResponse(scan);
    void this.devices.updateOne({ deviceId: dto.deviceId }, { $max: { lastSeenAt: new Date() } }).exec().catch(() => undefined);
    if (inserted) void this.realtime.publish(response).catch(() => undefined);
    return { scan: response, duplicate: !inserted };
  }

  private async existingScan(dto: ReceiveIotScanDto, scannedAt: Date, required: boolean) {
    let existing: IotRfidScan | null;
    try { existing = await this.scans.findOne({ scanId: dto.scanId }).lean().exec(); }
    catch { iotStorageUnavailable(); }
    if (!existing) { if (required) iotStorageUnavailable(); return null; }
    if (existing.purpose==='ATTENDANCE' || existing.deviceId !== dto.deviceId || existing.cardUid !== dto.cardUid
      || (existing.assignmentId ?? null) !== (dto.assignmentId ?? null)
      || existing.scannedAt.getTime() !== scannedAt.getTime() || existing.cardType !== dto.cardType) {
      throw new ConflictException('scanId đã được sử dụng với dữ liệu khác');
    }
    return { scan: scanResponse(existing), duplicate: true, scanDocument: existing };
  }

  async list(query: ListIotScansQueryDto) {
    const filter = {
      purpose: {$ne:'ATTENDANCE' as const},
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.cardUid ? { cardUid: query.cardUid } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.assignmentId ? { assignmentId: query.assignmentId } : {}),
    };
    try {
      const [scans, total] = await Promise.all([
        this.scans.find(filter).sort({ createdAt: -1, _id: -1 })
          .skip((query.page - 1) * query.limit).limit(query.limit).lean().exec(),
        this.scans.countDocuments(filter).exec(),
      ]);
      return { data: scans.map(scanResponse), total, page: query.page, limit: query.limit };
    } catch { iotStorageUnavailable(); }
  }
}
